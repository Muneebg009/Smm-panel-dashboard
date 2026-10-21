import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyze,
  parseQuery,
  applyProviderMappings,
  uniqueOrders,
  compareDecimal,
  compareGrossMargin,
} from "../src/lib/analytics/engine";
import { analyticsSource } from "../src/lib/analytics/source";
import { analyticsCSV } from "../src/lib/analytics/export";
import { MappingRepository, mappingInput } from "../src/lib/analytics/mappings";
import { sqliteDatabase } from "../src/lib/expenses/sqlite";
import type {
  AnalyticsQuery,
  AggregateRow,
  OrderRow,
  ProviderMapping,
} from "../src/lib/analytics/types";
import { minor, decimal } from "../src/lib/finance/money";
const query = (overrides: Partial<AnalyticsQuery> = {}): AnalyticsQuery => ({
  ...parseQuery(
    new URLSearchParams({
      mode: "demo",
      view: "orders",
      start: "2026-09-22",
      end: "2026-10-21",
    }),
  ),
  ...overrides,
});
const demo = () => analyticsSource("demo");
test("status aggregation includes all six statuses; pagination happens after filtering", () => {
  const result = analyze(demo(), query());
  assert.equal(result.counts.Total, 240);
  assert.equal(result.counts.Completed, 150);
  assert.equal(result.counts.Pending, 30);
  assert.equal(result.counts.Processing, 30);
  assert.equal(result.counts.Partial, 0);
  assert.equal(result.counts.Canceled, 30);
  assert.equal(result.rows.length, 10);
  assert.equal(result.total, 240);
  const second = analyze(demo(), query({ page: 2, status: "Pending" }));
  assert.equal(second.total, 30);
  assert.ok((second.rows as OrderRow[]).every((o) => o.status === "Pending"));
  assert.notEqual(
    second.rows[0].id,
    analyze(demo(), query({ status: "Pending" })).rows[0].id,
  );
});
test("advanced search, creation dates, currency, category and provider filters compose", () => {
  const result = analyze(
    demo(),
    query({ search: "Ahmed", start: "2026-10-21", end: "2026-10-21" }),
    true,
  );
  assert.ok(result.rows.length > 0);
  assert.ok(
    (result.rows as OrderRow[]).every(
      (o) =>
        o.customer?.includes("Ahmed") && o.createdAt.startsWith("2026-10-21"),
    ),
  );
  const category = analyze(
    demo(),
    query({ category: "Instagram", provider: "p1" }),
    true,
  );
  assert.ok(
    (category.rows as OrderRow[]).every(
      (o) => o.providerId === "p1" && o.serviceName?.includes("Instagram"),
    ),
  );
  assert.equal(analyze(demo(), query({ currency: "USD" })).total, 0);
});
test("financial aggregates use Phase 3 recognized postings, not quoted pending sales or costs", () => {
  const services = analyze(demo(), query({ view: "services" }), true)
    .rows as AggregateRow[];
  const revenue = services.reduce(
    (sum, s) => sum + minor(s.revenue!, "PKR"),
    0n,
  );
  const profit = services.reduce(
    (sum, s) => sum + minor(s.grossProfit!, "PKR"),
    0n,
  );
  assert.equal(revenue, 62587500n);
  assert.equal(profit, 27752000n);
  const pending = analyze(demo(), query({ status: "Pending" }))
    .rows as OrderRow[];
  assert.ok(
    pending.every(
      (o) =>
        o.recognizedRevenue === "0.00" &&
        o.grossProfit === "0.00" &&
        minor(o.sellingPrice!, "PKR") > 0n,
    ),
  );
});
test("rankings are global before pagination, capped at 20 and numerically sorted", () => {
  for (const ranking of [
    "quantity",
    "revenue",
    "profit",
    "low-margin",
    "loss",
    "canceled",
  ] as const) {
    const q = query({ view: "rankings", ranking });
    const result = analyze(demo(), q, true);
    assert.ok(result.total <= 20);
    const rows = result.rows as AggregateRow[];
    for (let i = 1; i < rows.length; i++) {
      const before = rows[i - 1],
        after = rows[i];
      if (ranking === "quantity")
        assert.ok(before.quantity! >= after.quantity!);
      if (ranking === "canceled") assert.ok(before.canceled >= after.canceled);
      if (ranking === "revenue")
        assert.ok(
          minor(before.revenue!, "PKR") >= minor(after.revenue!, "PKR"),
        );
      if (ranking === "profit")
        assert.ok(
          minor(before.grossProfit!, "PKR") >= minor(after.grossProfit!, "PKR"),
        );
      if (ranking === "low-margin")
        assert.ok(
          compareDecimal(before.margin, after.margin, "PKR", true) <= 0,
        );
      if (ranking === "loss") assert.ok(minor(after.grossProfit!, "PKR") < 0n);
    }
  }
});
test("unknown historical costs remain null and are excluded from profit/margin rankings", () => {
  const source = demo();
  source.ledger.postings = source.ledger.postings.map((p) =>
    p.kind === "provider_cost" ? { ...p, amount: null } : p,
  );
  for (const ranking of ["profit", "low-margin", "loss"] as const)
    assert.equal(
      analyze(source, query({ view: "rankings", ranking })).total,
      0,
    );
  const services = analyze(source, query({ view: "services" }))
    .rows as AggregateRow[];
  assert.ok(
    services.every(
      (s) =>
        s.grossProfit === null && s.margin === null && s.providerCosts === null,
    ),
  );
  assert.ok(services.every((s) => s.revenue !== null));
});
test("completion and cancellation rates use explicit statuses and sample thresholds", () => {
  const source = demo();
  const result = analyze(source, query({ view: "providers" }), true);
  for (const row of result.rows as AggregateRow[]) {
    assert.equal(
      Number(row.cancellationRate!.replace("%", "")),
      Math.floor((row.canceled / row.orderCount) * 10000) / 100,
    );
  }
  const small = analyze(
    source,
    query({ view: "services", start: "2026-10-21", end: "2026-10-21" }),
  );
  assert.ok(
    !small.insights.some((i) =>
      ["pending", "low-margin", "cancellation"].includes(i.kind),
    ),
  );
  const unknown = demo();
  unknown.orders[0] = { ...unknown.orders[0], status: "Unknown" };
  const provider = (
    analyze(unknown, query({ view: "providers" })).rows as AggregateRow[]
  ).find((p) => p.id === unknown.orders[0].providerId)!;
  assert.equal(provider.completionRate, null);
  assert.equal(provider.cancellationRate, null);
});
test("duplicate sync snapshots never increase counts; conflicts and source mixing fail", () => {
  const source = demo();
  source.orders.push({ ...source.orders[0] });
  assert.equal(analyze(source, query()).counts.Total, 240);
  assert.throws(
    () =>
      uniqueOrders([source.orders[0], { ...source.orders[0], quantity: 999 }]),
    /Conflicting/,
  );
  assert.throws(
    () => analyze(source, query({ mode: "live" })),
    /Mixed analytics sources/,
  );
});
test("unverified live capability reports unknown counts, not fabricated zeros or providers", () => {
  const live = analyticsSource("live");
  const result = analyze(live, query({ mode: "live", view: "providers" }));
  assert.equal(result.counts.Total, null);
  assert.equal(result.available, false);
  assert.deepEqual(result.chart, []);
  assert.equal(result.rows.length, 0);
  assert.deepEqual(applyProviderMappings(live, [mapping()]), live);
});
function mapping(overrides: Partial<ProviderMapping> = {}): ProviderMapping {
  return {
    id: "mapping-1",
    serviceId: "s1",
    providerId: "external-provider-7",
    providerName: "Administrator source reference",
    validFrom: "2026-10-01",
    validTo: null,
    note: "Authorized export reference",
    active: true,
    version: 1,
    createdAt: "2026-10-21T00:00:00Z",
    ...overrides,
  };
}
test("manual mapping requires explicit IDs/date ranges and never guesses or replaces verified associations", () => {
  const source = demo();
  source.mode = "live";
  source.ledger.source = "live";
  source.providers = [];
  source.orders = source.orders
    .slice(0, 2)
    .map((o) => ({ ...o, providerId: null, providerSource: null }));
  source.services = source.services.map((s) => ({
    ...s,
    providerId: null,
    providerSource: null,
  }));
  const applied = applyProviderMappings(source, [mapping()], "2026-10-21");
  assert.equal(applied.orders[0].providerId, "external-provider-7");
  assert.equal(applied.orders[0].providerSource, "manual");
  assert.equal(applied.orders[1].providerId, null);
  assert.equal(applied.services[0].providerSource, "manual");
  assert.equal(
    applyProviderMappings(source, [mapping({ validFrom: "2027-01-01" })])
      .orders[0].providerId,
    null,
  );
  source.orders[0].providerId = "verified-99";
  source.orders[0].providerSource = "verified";
  assert.equal(
    applyProviderMappings(source, [mapping()]).orders[0].providerId,
    "verified-99",
  );
  assert.throws(
    () =>
      applyProviderMappings(source, [
        mapping({ serviceId: "s2" }),
        mapping({ id: "other", serviceId: "s2" }),
      ]),
    /Ambiguous/,
  );
  assert.equal(
    applyProviderMappings(demo(), [mapping()]).orders[0].providerSource,
    "demo",
  );
});
test("query limits reject invalid pages, dates, unknown statuses and unbounded page sizes", () => {
  const invalidQueries: Record<string, string>[] = [
    { page: "0" },
    { page: "2.5" },
    { pageSize: "5000" },
    { status: "Fake" },
    { currency: "XYZ" },
    { start: "2026-02-31" },
    { start: "2020-01-01", end: "2026-10-21" },
  ];
  for (const invalid of invalidQueries) {
    assert.throws(() =>
      parseQuery(
        new URLSearchParams({
          mode: "demo",
          start: "2026-09-22",
          end: "2026-10-21",
          ...invalid,
        }),
      ),
    );
  }
});
test("CSV exports cover all filtered rows and distinguish quote vs recognized costs", () => {
  const q = query({ search: "Ayesha" });
  const result = analyze(demo(), q, true);
  assert.ok(result.rows.length > 10);
  const text = analyticsCSV(result, q);
  assert.match(text, /DEMO DATA/);
  assert.match(text, /Historical cost snapshot/);
  assert.match(text, /Recognized provider cost/);
  assert.match(text, /Asia\/Karachi/);
  assert.equal((text.match(/snapshot-quote/g) || []).length, result.total);
});
test("manual mapping storage audits creation/deactivation, prevents overlaps and stale edits", async () => {
  const db = sqliteDatabase(":memory:");
  try {
    const repo = new MappingRepository(db);
    await repo.initialize();
    const input = {
      serviceId: "actual-service-17",
      providerId: "actual-provider-3",
      providerName: "Administrator entered name",
      validFrom: "2026-10-01",
      validTo: "2026-10-31",
      note: "Reference from authorized provider export",
    };
    const id = "00000000-0000-4000-8000-000000000001";
    const first = await repo.create(input, id);
    assert.equal((await repo.create(input, id)).id, id);
    assert.equal((await repo.list()).length, 1);
    await assert.rejects(
      repo.create(
        { ...input, validFrom: "2026-10-15" },
        "00000000-0000-4000-8000-000000000002",
      ),
      { code: "OVERLAP" },
    );
    await repo.create(
      { ...input, validFrom: "2026-11-01", validTo: null },
      "00000000-0000-4000-8000-000000000003",
    );
    await repo.deactivate(first.id, 1);
    await assert.rejects(repo.deactivate(first.id, 1), { code: "CONFLICT" });
    const history = await repo.history(id);
    assert.equal(history.length, 2);
    assert.equal(history[0].before, null);
    assert.equal(history[1].after.active, false);
    assert.throws(() => mappingInput({ ...input, providerId: "" }));
    assert.throws(() => mappingInput({ ...input, validTo: "2026-09-30" }));
  } finally {
    db.close();
  }
});
test("top 20 is chosen globally before the second page is selected", () => {
  const source = demo(),
    template = source.orders[0],
    service = source.services[0],
    posting = source.ledger.postings[0];
  source.orders = Array.from({ length: 25 }, (_, i) => ({
    ...template,
    id: `test-order-${i}`,
    serviceId: `test-service-${i}`,
    status: "Completed",
  }));
  source.services = Array.from({ length: 25 }, (_, i) => ({
    ...service,
    id: `test-service-${i}`,
    name: `Mock service ${i}`,
  }));
  source.ledger.postings = source.orders.flatMap((o, i) => [
    {
      ...posting,
      id: `test-sale-${i}`,
      transactionId: `test-sale-${i}`,
      orderId: o.id,
      serviceId: o.serviceId!,
      allocationId: o.id,
      amount: `${100 + i}.00`,
    },
    {
      ...posting,
      id: `test-cost-${i}`,
      transactionId: `test-cost-${i}`,
      orderId: o.id,
      serviceId: o.serviceId!,
      allocationId: o.id,
      kind: "provider_cost" as const,
      amount: "60.00",
    },
  ]);
  const result = analyze(
    source,
    query({ view: "rankings", ranking: "profit", page: 2 }),
  );
  assert.equal(result.total, 20);
  assert.equal(result.rows.length, 10);
  assert.equal(result.rows[0].id, "test-service-14");
  assert.equal(result.rows[9].id, "test-service-5");
});
test("margin ranking compares exact fractions rather than rounded display percentages", () => {
  const row = analyze(demo(), query({ view: "services" }))
    .rows[0] as AggregateRow;
  const a = {
      ...row,
      revenue: "1000000.00",
      grossProfit: "1000.01",
      margin: "0.10%",
    },
    b = {
      ...row,
      revenue: "1000000.00",
      grossProfit: "1000.02",
      margin: "0.10%",
    };
  assert.equal(compareDecimal(a.margin, b.margin, "PKR", true), 0);
  assert.equal(compareGrossMargin(a, b, "PKR", true), -1);
});
test("known losses and sampled rate insights are transparent; unmapped providers stay unassigned", () => {
  const source = demo();
  const first = source.orders[0];
  source.orders[0] = { ...first, providerId: null, providerSource: null };
  const cost = source.ledger.postings.find(
    (p) => p.kind === "provider_cost" && p.orderId === first.id,
  )!;
  cost.amount = decimal(minor(first.sellingPrice!, "PKR") + 100000n, "PKR");
  const result = analyze(source, query({ view: "services" }));
  assert.ok(result.insights.some((i) => i.kind === "negative-order"));
  assert.ok(result.insights.some((i) => i.kind === "cancellation"));
  assert.equal(result.unmappedOrders, 1);
  const waiting = demo();
  waiting.orders = waiting.orders.map((o) => ({ ...o, status: "Pending" }));
  waiting.ledger.coverage.revenue = false;
  waiting.ledger.coverage.costs = false;
  const signals = analyze(
    waiting,
    query({ view: "providers" }),
  ).insights.filter((i) => i.kind === "pending");
  assert.ok(signals.length > 0);
  assert.ok(
    signals.every(
      (i) =>
        i.message.includes("minimum 20 orders") &&
        i.message.includes("not assumed defects"),
    ),
  );
});
test("Unknown statuses remain visible in the chart and suppress unsupported rates", () => {
  const source = demo();
  source.orders[0] = { ...source.orders[0], status: "Unknown" };
  const result = analyze(source, query());
  assert.equal(
    result.chart.reduce((sum, bucket) => sum + bucket.orders, 0),
    240,
  );
  assert.equal(result.chart.find((row) => row.name === "Unknown")?.orders, 1);
});
test("historical provider-filtered rankings do not rewrite attribution using a changed catalog provider", () => {
  const source = demo();
  source.services[0].providerId = "p2";
  const ranked = analyze(
    source,
    query({ view: "rankings", ranking: "profit", provider: "p1" }),
    true,
  ).rows as AggregateRow[];
  assert.ok(ranked.some((s) => s.id === "s1" && s.orderCount > 0));
  const catalog = analyze(
    source,
    query({ view: "services", provider: "p1" }),
    true,
  ).rows;
  assert.ok(!catalog.some((s) => s.id === "s1"));
});
