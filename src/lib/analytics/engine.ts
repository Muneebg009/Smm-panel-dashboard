import { DEMO_TODAY } from "../data";
import { dateKey, daysBetween, validDate, shiftDate } from "../finance/dates";
import { minor, isCurrency, type Currency } from "../finance/money";
import { totals } from "../finance/engine";
import {
  orderStatuses,
  type AnalyticsOrder,
  type AnalyticsQuery,
  type AnalyticsSource,
  type AggregateRow,
  type AnalyticsResult,
  type OrderRow,
  type ProviderMapping,
} from "./types";
export const MIN_RATE_SAMPLE = 20;
export const MIN_FINANCIAL_SAMPLE = 5;
export function parseQuery(params: URLSearchParams): AnalyticsQuery {
  const allowed = (
    key: string,
    values: readonly string[],
    fallback: string,
  ) => {
    const value = params.get(key) ?? fallback;
    if (!values.includes(value)) throw Error("Invalid " + key);
    return value;
  };
  const mode = allowed(
    "mode",
    ["live", "demo"],
    "live",
  ) as AnalyticsQuery["mode"];
  const end =
    params.get("end") ?? (mode === "demo" ? DEMO_TODAY : dateKey(new Date()));
  const start = params.get("start") ?? shiftDate(end, -29);
  if (!validDate(start) || !validDate(end) || daysBetween(start, end) > 366)
    throw Error("Select an inclusive range of at most 366 days");
  const currency = params.get("currency") ?? "PKR";
  if (!isCurrency(currency)) throw Error("Unsupported currency");
  const search = params.get("search") ?? "";
  if (search.length > 200) throw Error("Search is too long");
  const page = Number(params.get("page") ?? 1),
    pageSize = Number(params.get("pageSize") ?? 10);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    ![10, 20, 50].includes(pageSize)
  )
    throw Error("Invalid pagination");
  for (const key of ["category", "provider", "serviceStatus"])
    if ((params.get(key)?.length ?? 0) > 120) throw Error("Invalid filter");
  return {
    mode,
    view: allowed(
      "view",
      ["orders", "services", "rankings", "providers"],
      "orders",
    ) as AnalyticsQuery["view"],
    start,
    end,
    currency,
    search,
    status: allowed(
      "status",
      ["All", ...orderStatuses],
      "All",
    ) as AnalyticsQuery["status"],
    category: params.get("category") ?? "All",
    provider: params.get("provider") ?? "All",
    serviceStatus: params.get("serviceStatus") ?? "All",
    sort: allowed(
      "sort",
      ["date-desc", "date-asc", "name", "revenue", "profit", "cost", "margin"],
      "date-desc",
    ) as AnalyticsQuery["sort"],
    ranking: allowed(
      "ranking",
      ["quantity", "revenue", "profit", "low-margin", "loss", "canceled"],
      "quantity",
    ) as AnalyticsQuery["ranking"],
    page,
    pageSize,
  };
}
export function uniqueOrders(orders: AnalyticsOrder[]): AnalyticsOrder[] {
  const found = new Map<string, AnalyticsOrder>();
  for (const order of orders) {
    const before = found.get(order.id);
    if (
      before &&
      JSON.stringify(Object.fromEntries(Object.entries(before).sort())) !==
        JSON.stringify(Object.fromEntries(Object.entries(order).sort()))
    )
      throw Error("Conflicting synchronized order snapshot");
    if (!Number.isSafeInteger(order.quantity) && order.quantity !== null)
      throw Error("Invalid quantity");
    if (order.quantity !== null && order.quantity < 0)
      throw Error("Negative quantity");
    if (!order.id || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(order.createdAt))
      throw Error("Invalid order identity or timestamp");
    dateKey(order.createdAt);
    found.set(order.id, order);
  }
  return [...found.values()];
}
export function applyProviderMappings(
  source: AnalyticsSource,
  mappings: ProviderMapping[],
  asOf = dateKey(new Date()),
): AnalyticsSource {
  if (source.mode === "demo" || !source.available) return source;
  const resolve = (serviceId: string | null, day: string) => {
    const matches = mappings.filter(
      (m) =>
        m.active &&
        m.serviceId === serviceId &&
        m.validFrom <= day &&
        (!m.validTo || m.validTo >= day),
    );
    if (matches.length > 1) throw Error("Ambiguous provider mapping");
    return matches[0];
  };
  const manualNames = new Map<string, string>();
  for (const mapping of mappings.filter((m) => m.active)) {
    if (
      manualNames.has(mapping.providerId) &&
      manualNames.get(mapping.providerId) !== mapping.providerName
    )
      throw Error("Conflicting manual provider identity");
    manualNames.set(mapping.providerId, mapping.providerName);
    const provider = source.providers.find((p) => p.id === mapping.providerId);
    if (provider && provider.name !== mapping.providerName)
      throw Error(
        "Manual provider identifier conflicts with verified provider data",
      );
  }
  const mappedServices = source.services.map((s) => {
    if (s.providerId) return s;
    const mapping = resolve(s.id, asOf);
    return mapping
      ? {
          ...s,
          providerId: mapping.providerId,
          providerSource: "manual" as const,
        }
      : s;
  });
  const orders = source.orders.map((o) => {
    if (o.providerId) return o;
    const mapping = resolve(o.serviceId, dateKey(o.createdAt));
    return mapping
      ? {
          ...o,
          providerId: mapping.providerId,
          providerSource: "manual" as const,
        }
      : o;
  });
  const providers = [...source.providers];
  for (const mapping of mappings.filter((m) => m.active)) {
    if (!providers.some((p) => p.id === mapping.providerId))
      providers.push({
        id: mapping.providerId,
        name: mapping.providerName,
        source: "manual",
      });
  }
  return { ...source, orders, services: mappedServices, providers };
}
const ratio = (n: number, d: number) =>
  d
    ? `${((BigInt(n) * 10000n) / BigInt(d) / 100n).toString()}.${(((BigInt(n) * 10000n) / BigInt(d)) % 100n).toString().padStart(2, "0")}%`
    : null;
export function compareDecimal(
  a: string | null,
  b: string | null,
  currency: Currency,
  ascending = false,
): number {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  const av = minor(a.replace("%", ""), a.includes("%") ? "USD" : currency),
    bv = minor(b.replace("%", ""), b.includes("%") ? "USD" : currency);
  return av === bv ? 0 : (av < bv ? -1 : 1) * (ascending ? 1 : -1);
}
export function compareGrossMargin(
  a: OrderRow | AggregateRow,
  b: OrderRow | AggregateRow,
  currency: Currency,
  ascending = false,
): number {
  const ar = "recognizedRevenue" in a ? a.recognizedRevenue : a.revenue;
  const br = "recognizedRevenue" in b ? b.recognizedRevenue : b.revenue;
  const knownA =
    ar !== null && a.grossProfit !== null && minor(ar, currency) > 0n;
  const knownB =
    br !== null && b.grossProfit !== null && minor(br, currency) > 0n;
  if (!knownA) return knownB ? 1 : 0;
  if (!knownB) return -1;
  const cross =
    minor(a.grossProfit!, currency) * minor(br!, currency) -
    minor(b.grossProfit!, currency) * minor(ar!, currency);
  return cross === 0n ? 0 : (cross < 0n ? -1 : 1) * (ascending ? 1 : -1);
}
function financial(
  source: AnalyticsSource,
  orders: AnalyticsOrder[],
  q: AnalyticsQuery,
) {
  const ids = new Set(orders.map((o) => o.id));
  return totals(
    {
      ...source.ledger,
      postings: source.ledger.postings.filter(
        (p) => p.orderId && ids.has(p.orderId),
      ),
    },
    [],
    q.currency,
    q.start,
    q.end,
  );
}
export function analyze(
  source: AnalyticsSource,
  q: AnalyticsQuery,
  allRows = false,
): AnalyticsResult {
  if (source.mode !== q.mode || source.ledger.source !== q.mode)
    throw Error("Mixed analytics sources");
  const services = new Map(source.services.map((s) => [s.id, s]));
  const providers = new Map(source.providers.map((p) => [p.id, p]));
  const search = q.search.toLocaleLowerCase();
  const scope = uniqueOrders(source.orders).filter(
    (o) =>
      o.currency === q.currency &&
      dateKey(o.createdAt) >= q.start &&
      dateKey(o.createdAt) <= q.end &&
      (q.provider === "All" || o.providerId === q.provider) &&
      (q.category === "All" ||
        services.get(o.serviceId ?? "")?.category === q.category),
  );
  const searched = scope.filter((o) =>
    [
      o.id,
      o.customer,
      o.serviceId,
      o.providerId,
      services.get(o.serviceId ?? "")?.name,
      providers.get(o.providerId ?? "")?.name,
    ].some((value) => value?.toLocaleLowerCase().includes(search)),
  );
  const counts: AnalyticsResult["counts"] = {
    Total: source.available ? searched.length : null,
    Completed: null,
    Pending: null,
    Partial: null,
    Canceled: null,
    Processing: null,
    Unknown: null,
  };
  for (const status of orderStatuses)
    counts[status] = source.available
      ? searched.filter((o) => o.status === status).length
      : null;
  const selected = searched.filter(
    (o) => q.status === "All" || o.status === q.status,
  );
  const orderRows: OrderRow[] = selected.map((o) => {
    const total = financial(source, [o], q);
    return {
      ...o,
      serviceName: services.get(o.serviceId ?? "")?.name ?? null,
      providerName: providers.get(o.providerId ?? "")?.name ?? null,
      recognizedRevenue: total.revenue,
      providerCosts: total.providerCosts,
      grossProfit: total.grossProfit,
      margin: total.margin,
    };
  });
  const aggregate = (
    id: string,
    name: string,
    orders: AnalyticsOrder[],
    serviceId?: string,
  ): AggregateRow => {
    const service = serviceId ? services.get(serviceId) : undefined;
    const result = financial(source, orders, q);
    const known = orders.every((o) => o.status !== "Unknown");
    const completed = orders.filter((o) => o.status === "Completed").length,
      canceled = orders.filter((o) => o.status === "Canceled").length,
      pending = orders.filter((o) => o.status === "Pending").length,
      processing = orders.filter((o) => o.status === "Processing").length;
    const quantity = orders.some((o) => o.quantity === null)
      ? null
      : orders.reduce((sum, o) => sum + o.quantity!, 0);
    if (quantity !== null && !Number.isSafeInteger(quantity))
      throw Error("Quantity exceeds safe range");
    const providerIds = [
      ...new Set(orders.map((o) => o.providerId).filter(Boolean)),
    ];
    const providerId =
      service?.providerId ??
      (providerIds.length === 1 ? (providerIds[0] ?? null) : null);
    let rateMargin: string | null = null;
    if (
      service?.sellingRate !== null &&
      service?.sellingRate !== undefined &&
      service.providerRate !== null
    ) {
      const sale = minor(service.sellingRate, q.currency),
        cost = minor(service.providerRate, q.currency);
      if (sale > 0n) {
        const bp = ((sale - cost) * 10000n) / sale;
        rateMargin = `${bp < 0n ? "-" : ""}${(bp < 0n ? -bp : bp) / 100n}.${((bp < 0n ? -bp : bp) % 100n).toString().padStart(2, "0")}%`;
      }
    }
    return {
      id,
      name,
      category: service?.category ?? null,
      providerId,
      providerName: providerId
        ? (providers.get(providerId)?.name ?? null)
        : null,
      providerSource:
        service?.providerSource ??
        (providerId ? (providers.get(providerId)?.source ?? null) : null),
      orderCount: orders.length,
      quantity,
      completed,
      pending,
      processing,
      partial: orders.filter((o) => o.status === "Partial").length,
      canceled,
      completionRate: known ? ratio(completed, orders.length) : null,
      cancellationRate: known ? ratio(canceled, orders.length) : null,
      pendingRate: known ? ratio(pending + processing, orders.length) : null,
      financialSample: orderRows.filter(
        (o) =>
          orders.some((v) => v.id === o.id) &&
          o.recognizedRevenue !== null &&
          minor(o.recognizedRevenue, q.currency) > 0n,
      ).length,
      connectedServices: source.services.filter((s) => s.providerId === id)
        .length,
      revenue: result.revenue,
      providerCosts: result.providerCosts,
      grossProfit: result.grossProfit,
      margin: result.margin,
      sellingRate: service?.sellingRate ?? null,
      providerRate: service?.providerRate ?? null,
      rateMargin,
      rateUnit: service?.rateUnit ?? null,
      status: service?.status ?? null,
      imported: service?.imported ?? null,
    };
  };
  let serviceRows = source.services
    .filter(
      (s) =>
        s.currency === q.currency &&
        (q.category === "All" || s.category === q.category) &&
        (q.provider === "All" ||
          (q.view === "services"
            ? s.providerId === q.provider
            : scope.some(
                (o) => o.serviceId === s.id && o.providerId === q.provider,
              ))) &&
        (q.serviceStatus === "All" ||
          (s.status ?? "Unavailable") === q.serviceStatus) &&
        [s.id, s.name, s.category].some((value) =>
          value?.toLowerCase().includes(search),
        ),
    )
    .map((s) =>
      aggregate(
        s.id,
        s.name,
        scope.filter(
          (o) =>
            o.serviceId === s.id &&
            (q.status === "All" || o.status === q.status),
        ),
        s.id,
      ),
    );
  const providerRows = source.providers
    .filter(
      (p) =>
        (q.provider === "All" || p.id === q.provider) &&
        [p.id, p.name].some((v) => v.toLowerCase().includes(search)),
    )
    .map((p) => ({
      ...aggregate(
        p.id,
        p.name,
        scope.filter(
          (o) =>
            o.providerId === p.id &&
            (q.status === "All" || o.status === q.status),
        ),
      ),
      providerSource: scope.some(
        (o) => o.providerId === p.id && o.providerSource === "manual",
      )
        ? ("manual" as const)
        : p.source,
    }));
  const insights: AnalyticsResult["insights"] = [];
  for (const s of serviceRows) {
    if (
      s.orderCount >= MIN_RATE_SAMPLE &&
      s.financialSample >= MIN_FINANCIAL_SAMPLE &&
      s.margin !== null &&
      minor(s.margin.replace("%", ""), "USD") < 1500n
    )
      insights.push({
        kind: "low-margin",
        reference: s.id,
        message: `${s.name}: gross margin ${s.margin}; ${s.financialSample} recognized orders. Threshold <15%, ≥20 orders and ≥5 recognized sales.`,
      });
    if (
      s.orderCount >= MIN_RATE_SAMPLE &&
      s.cancellationRate !== null &&
      minor(s.cancellationRate.replace("%", ""), "USD") >= 2000n
    )
      insights.push({
        kind: "cancellation",
        reference: s.id,
        message: `${s.name}: ${s.canceled}/${s.orderCount} canceled (${s.cancellationRate}). Threshold ≥20%, minimum 20 orders. This is not a service-defect diagnosis.`,
      });
  }
  for (const p of providerRows)
    if (
      p.orderCount >= MIN_RATE_SAMPLE &&
      p.pendingRate !== null &&
      minor(p.pendingRate.replace("%", ""), "USD") >= 5000n
    )
      insights.push({
        kind: "pending",
        reference: p.id,
        message: `${p.name}: ${p.pending + p.processing}/${p.orderCount} pending or processing (${p.pendingRate}). Threshold ≥50%, minimum 20 orders; investigate timing, not assumed defects.`,
      });
  const highest = [...serviceRows]
    .filter((s) => s.revenue !== null)
    .sort((a, b) => compareDecimal(a.revenue, b.revenue, q.currency))[0];
  if (highest && minor(highest.revenue!, q.currency) > 0n)
    insights.push({
      kind: "revenue",
      reference: highest.id,
      message: `${highest.name} has the highest recognized revenue in this filtered cohort: ${q.currency} ${highest.revenue}.`,
    });
  for (const o of orderRows
    .filter(
      (o) => o.grossProfit !== null && minor(o.grossProfit, q.currency) < 0n,
    )
    .slice(0, 20))
    insights.push({
      kind: "negative-order",
      reference: o.id,
      message: `${o.id}: known-input gross loss ${q.currency} ${o.grossProfit}. No paid test or order action is offered.`,
    });
  if (q.view === "rankings") {
    if (q.ranking === "loss")
      serviceRows = serviceRows.filter(
        (s) => s.grossProfit !== null && minor(s.grossProfit, q.currency) < 0n,
      );
    if (q.ranking === "quantity")
      serviceRows = serviceRows
        .filter((s) => s.quantity !== null)
        .sort((a, b) => b.quantity! - a.quantity! || a.id.localeCompare(b.id));
    if (q.ranking === "canceled")
      serviceRows.sort(
        (a, b) => b.canceled - a.canceled || a.id.localeCompare(b.id),
      );
    if (["revenue", "profit", "low-margin", "loss"].includes(q.ranking)) {
      const key =
        q.ranking === "revenue"
          ? "revenue"
          : q.ranking === "low-margin"
            ? "margin"
            : "grossProfit";
      serviceRows = serviceRows
        .filter((s) => s[key] !== null)
        .sort(
          (a, b) =>
            (q.ranking === "low-margin"
              ? compareGrossMargin(a, b, q.currency, true)
              : compareDecimal(
                  a[key],
                  b[key],
                  q.currency,
                  q.ranking === "loss",
                )) || a.id.localeCompare(b.id),
        );
    }
    serviceRows = serviceRows.slice(0, 20);
  }
  let rows: (OrderRow | AggregateRow)[] =
    q.view === "orders"
      ? orderRows
      : q.view === "providers"
        ? providerRows
        : serviceRows;
  if (q.view !== "rankings")
    rows.sort((a, b) => {
      if (q.sort === "name")
        return (
          ("name" in a ? a.name : a.id).localeCompare(
            "name" in b ? b.name : b.id,
          ) || a.id.localeCompare(b.id)
        );
      if (q.sort === "date-desc" || q.sort === "date-asc") {
        if ("createdAt" in a && "createdAt" in b)
          return (
            (Date.parse(a.createdAt) - Date.parse(b.createdAt)) *
              (q.sort === "date-asc" ? 1 : -1) || a.id.localeCompare(b.id)
          );
        return a.id.localeCompare(b.id);
      }
      if (q.sort === "margin")
        return compareGrossMargin(a, b, q.currency) || a.id.localeCompare(b.id);
      const key =
        q.sort === "revenue"
          ? "recognizedRevenue" in a
            ? "recognizedRevenue"
            : "revenue"
          : q.sort === "cost"
            ? "providerCosts"
            : "grossProfit";
      return (
        compareDecimal(
          (a as unknown as Record<string, string | null>)[key],
          (b as unknown as Record<string, string | null>)[key],
          q.currency,
        ) || a.id.localeCompare(b.id)
      );
    });
  const total = rows.length,
    pages = Math.max(1, Math.ceil(total / q.pageSize)),
    page = Math.min(q.page, pages);
  if (allRows && rows.length > 5000)
    throw Error("Export exceeds 5000 rows; narrow your filters");
  if (!allRows) rows = rows.slice((page - 1) * q.pageSize, page * q.pageSize);
  return {
    mode: source.mode,
    available: source.available,
    reason: source.reason,
    currency: q.currency,
    start: q.start,
    end: q.end,
    counts,
    categories: [
      ...new Set(
        source.services.map((s) => s.category).filter((v): v is string => !!v),
      ),
    ].sort(),
    providerOptions: source.providers.map((p) => ({ id: p.id, name: p.name })),
    rows,
    page,
    pageSize: q.pageSize,
    total,
    pages,
    insights: insights.slice(0, 50),
    chart: source.available
      ? orderStatuses
          .filter(
            (s) =>
              s !== "Unknown" || searched.some((o) => o.status === "Unknown"),
          )
          .map((name) => ({
            name,
            orders: searched.filter((o) => o.status === name).length,
            canceled: 0,
          }))
      : [],
    manualMappings: 0,
    unmappedOrders: source.available
      ? scope.filter((o) => o.providerId === null).length
      : null,
  };
}
