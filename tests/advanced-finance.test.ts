import { test } from "node:test";
import assert from "node:assert/strict";
import { minor, decimal, prorate } from "../src/lib/finance/money";
import { dateKey, periods } from "../src/lib/finance/dates";
import {
  totals,
  deduplicate,
  expenseAllocation,
  groupProfit,
} from "../src/lib/finance/engine";
import { csv } from "../src/lib/finance/csv";
import type {
  Posting,
  Ledger,
  FinancialExpense,
} from "../src/lib/finance/types";
const date = "2026-10-21";
const posting = (overrides: Partial<Posting> = {}): Posting => ({
  id: "sale",
  transactionId: "tx-sale",
  kind: "revenue",
  occurredAt: date + "T12:00:00+05:00",
  currency: "PKR",
  amount: "100.00",
  orderId: "o1",
  serviceId: "s1",
  providerId: "p1",
  allocationId: "delivery-1",
  orderState: "completed",
  ...overrides,
});
const cost = posting({
  id: "cost",
  transactionId: "tx-cost",
  kind: "provider_cost",
  amount: "60.00",
});
const ledger = (postings: Posting[]): Ledger => ({
  source: "live",
  postings,
  coverage: {
    revenue: true,
    costs: true,
    refunds: true,
    cash: true,
    nonOperating: true,
    tax: true,
  },
  lastSyncAt: null,
});
const report = (rows: Posting[]) => totals(ledger(rows), [], "PKR", date, date);
const expense: FinancialExpense = {
  id: "e1",
  date,
  amount: "100.00",
  currency: "PKR",
  description: "Hosting",
  category: "Hosting",
  allocationStart: "2026-10-01",
  allocationEnd: "2026-10-03",
  status: "active",
};
test("completed orders use exact historical selling amounts and attributable cost", () => {
  const r = report([posting(), cost]);
  assert.equal(r.revenue, "100.00");
  assert.equal(r.grossProfit, "40.00");
  assert.equal(r.netProfit, "40.00");
  assert.equal(r.margin, "40.00%");
  assert.equal(r.cashFlow, "0.00");
});
test("partial deliveries recognize only explicitly verified delivered amounts", () => {
  const r = report([
    posting({ amount: "25.00", orderState: "partial", deliveryVerified: true }),
    { ...cost, amount: "15.00" },
  ]);
  assert.equal(r.grossProfit, "10.00");
  assert.throws(
    () => report([posting({ orderState: "partial" }), cost]),
    /delivery evidence/,
  );
  assert.equal(prorate("100.00", 250, 1000, "PKR"), "25.00");
});
test("pending orders cannot recognize revenue; canceled undelivered orders recognize zero", () => {
  assert.throws(
    () => report([posting({ orderState: undefined })]),
    /verified order state/,
  );
  assert.throws(() => report([posting({ orderState: "pending" })]), /Pending/);
  const r = report([
    posting({ orderState: "canceled", amount: "0.00" }),
    { ...cost, amount: "0.00" },
  ]);
  assert.equal(r.grossProfit, "0.00");
});
test("customer refunds reduce sales, provider refunds reduce costs exactly once", () => {
  const refund = posting({
    id: "refund",
    transactionId: "tx-refund",
    kind: "customer_refund",
    amount: "100.00",
  });
  const providerRefund = posting({
    id: "provider-refund",
    transactionId: "tx-provider-refund",
    kind: "provider_refund",
    amount: "60.00",
  });
  const r = report([
    posting({ orderState: "canceled" }),
    cost,
    refund,
    providerRefund,
  ]);
  assert.equal(r.revenue, "0.00");
  assert.equal(r.providerCosts, "0.00");
  assert.equal(r.grossProfit, "0.00");
});
test("refunds already embedded in verified net amounts are not subtracted twice", () => {
  const sale = posting({ amount: "80.00", includedAdjustmentIds: ["refund"] });
  const refund = posting({
    id: "refund",
    transactionId: "tx-refund",
    kind: "customer_refund",
    amount: "20.00",
    includedIn: "sale",
  });
  assert.equal(report([sale, cost, refund]).grossProfit, "20.00");
  assert.throws(() => report([posting(), cost, refund]), /embedded adjustment/);
  assert.throws(
    () =>
      report([
        sale,
        cost,
        { ...refund, occurredAt: "2026-10-22T12:00:00+05:00" },
      ]),
    /embedded adjustment/,
  );
});
test("refunds after the original reporting period are posted on their own date", () => {
  const refund = posting({
    id: "refund",
    transactionId: "tx-refund",
    kind: "customer_refund",
    amount: "20.00",
    occurredAt: "2026-10-22T12:00:00+05:00",
  });
  const data = ledger([posting(), cost, refund]);
  assert.equal(totals(data, [], "PKR", date, date).revenue, "100.00");
  assert.equal(
    totals(data, [], "PKR", "2026-10-22", "2026-10-22").revenue,
    "-20.00",
  );
});
test("duplicate event IDs and transaction IDs do not double count; conflicts fail", () => {
  assert.equal(
    report([posting(), cost, posting(), { ...cost, id: "another-event-id" }])
      .grossProfit,
    "40.00",
  );
  assert.throws(
    () => deduplicate([posting(), posting({ amount: "110.00" })]),
    /Conflicting/,
  );
  assert.throws(
    () => deduplicate([posting(), posting({ id: "new-id", amount: "110.00" })]),
    /Conflicting/,
  );
});
test("missing provider costs make gross, operating and net profit unavailable", () => {
  for (const rows of [[posting()], [posting(), { ...cost, amount: null }]]) {
    const r = report(rows);
    assert.equal(r.revenue, "100.00");
    assert.equal(r.providerCosts, null);
    assert.equal(r.grossProfit, null);
    assert.equal(r.netProfit, null);
  }
});
test("expense allocation distributes indivisible cents deterministically and reconciles", () => {
  assert.equal(expenseAllocation(expense, "2026-10-01", "2026-10-01"), 3334n);
  assert.equal(expenseAllocation(expense, "2026-10-02", "2026-10-02"), 3333n);
  assert.equal(expenseAllocation(expense, "2026-10-01", "2026-10-03"), 10000n);
  assert.equal(
    expenseAllocation(
      { ...expense, status: "void" },
      "2026-10-01",
      "2026-10-03",
    ),
    0n,
  );
  const r = totals(
    ledger([posting(), cost]),
    [
      {
        ...expense,
        amount: "10.00",
        allocationStart: date,
        allocationEnd: date,
      },
    ],
    "PKR",
    date,
    date,
  );
  assert.equal(r.grossProfit, "40.00");
  assert.equal(r.operatingProfit, "30.00");
  assert.equal(r.netProfit, "30.00");
});
test("historical rate snapshots are independent of a changed service catalog", () => {
  const service = { currentPrice: "999.00", currentCost: "990.00" };
  assert.equal(report([posting(), cost]).grossProfit, "40.00");
  service.currentPrice = "5000.00";
  service.currentCost = "4500.00";
  assert.equal(report([posting(), cost]).grossProfit, "40.00");
});
test("currencies never aggregate and currency-specific precision is enforced", () => {
  const data = ledger([
    posting(),
    cost,
    posting({
      id: "usd-sale",
      transactionId: "usd-sale",
      currency: "USD",
      amount: "5.00",
    }),
    {
      ...cost,
      id: "usd-cost",
      transactionId: "usd-cost",
      currency: "USD",
      amount: "2.00",
    },
  ]);
  assert.equal(totals(data, [], "PKR", date, date).grossProfit, "40.00");
  assert.equal(totals(data, [], "USD", date, date).grossProfit, "3.00");
  assert.equal(
    decimal(minor("0.10", "USD") + minor("0.20", "USD"), "USD"),
    "0.30",
  );
  assert.throws(() => minor("1.001", "PKR"));
  assert.throws(() => minor("1.1", "JPY"));
  assert.equal(minor("1.001", "KWD"), 1001n);
});
test("wallet deposits affect only cash and taxes/non-operating costs are separate", () => {
  const r = report([
    posting(),
    cost,
    posting({
      id: "deposit",
      transactionId: "deposit",
      kind: "wallet_deposit",
      amount: "500.00",
    }),
    posting({ id: "tax", transactionId: "tax", kind: "tax", amount: "5.00" }),
    posting({
      id: "other",
      transactionId: "other",
      kind: "other_expense",
      amount: "2.00",
    }),
  ]);
  assert.equal(r.revenue, "100.00");
  assert.equal(r.operatingProfit, "40.00");
  assert.equal(r.netProfit, "33.00");
  assert.equal(r.cashFlow, "500.00");
});
test("unknown coverage remains unavailable, including empty live periods and unknown taxes", () => {
  const data = ledger([]);
  data.coverage.revenue = false;
  data.coverage.costs = false;
  assert.equal(totals(data, [], "PKR", date, date).revenue, null);
  const known = ledger([posting(), cost]);
  known.coverage.tax = false;
  assert.equal(totals(known, [], "PKR", date, date).netProfit, null);
  assert.equal(
    totals(ledger([posting(), cost]), [], "PKR", date, date, false)
      .operatingProfit,
    null,
  );
});
test("reporting boundaries use Asia/Karachi and correct month/year transitions", () => {
  assert.equal(dateKey("2026-10-20T20:30:00Z"), "2026-10-21");
  assert.equal(dateKey("2026-10-20T18:59:59Z"), "2026-10-20");
  assert.deepEqual(periods("2026-01-01").lastMonth, {
    start: "2025-12-01",
    end: "2025-12-31",
  });
  assert.throws(
    () => report([posting({ occurredAt: "2026-10-21T12:00:00" })]),
    /timezone/,
  );
});
test("order/service/provider groups reconcile and CSV neutralizes spreadsheet formulas", () => {
  assert.equal(
    groupProfit(ledger([posting(), cost]), "PKR", date, date, "providerId")[0]
      .grossProfit,
    "40.00",
  );
  assert.match(csv([['=HYPERLINK("x")', null, "100.00"]]), /"'=HYPERLINK/);
  assert.match(csv([[null]]), /Unavailable/);
});
