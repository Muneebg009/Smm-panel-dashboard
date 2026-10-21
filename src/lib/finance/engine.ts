import { minor, decimal, type Currency } from "./money";
import { dateKey, daysBetween, shiftDate, validDate } from "./dates";
import type {
  FinancialExpense,
  FinancialTotals,
  Ledger,
  Posting,
} from "./types";
export function deduplicate(postings: Posting[]): Posting[] {
  const ids = new Map<string, string>();
  const transactions = new Map<string, string>();
  const output: Posting[] = [];
  for (const p of postings) {
    if (!p.id || !p.transactionId)
      throw Error("Stable ledger identifiers required");
    const { id, ...payload } = p;
    const canonical = JSON.stringify(
      Object.fromEntries(
        Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
    const previous = ids.get(id);
    if (previous && previous !== canonical)
      throw Error("Conflicting event replay");
    const key = `${p.transactionId}:${p.kind}`;
    const tx = transactions.get(key);
    if (tx && tx !== canonical) throw Error("Conflicting transaction replay");
    ids.set(id, canonical);
    if (previous || tx) continue;
    transactions.set(key, canonical);
    output.push(p);
  }
  return output;
}
export function expenseAllocation(
  e: FinancialExpense,
  start: string,
  end: string,
): bigint {
  if (e.status === "void") return 0n;
  const count = daysBetween(e.allocationStart, e.allocationEnd);
  if (count > 3660) throw Error("Expense allocation too long");
  const total = minor(e.amount, e.currency);
  if (total < 0n) throw Error("Negative expense");
  const daily = total / BigInt(count);
  const remainder = total % BigInt(count);
  let allocated = 0n;
  for (let i = 0; i < count; i++) {
    const day = shiftDate(e.allocationStart, i);
    if (day >= start && day <= end)
      allocated += daily + (BigInt(i) < remainder ? 1n : 0n);
  }
  return allocated;
}
export function totals(
  ledger: Ledger,
  expenses: FinancialExpense[],
  currency: Currency,
  start: string,
  end: string,
  expensesComplete = true,
): FinancialTotals {
  if (!validDate(start) || !validDate(end) || daysBetween(start, end) > 3660)
    throw Error("Invalid reporting period");
  const all = deduplicate(ledger.postings);
  const index = new Map(all.map((p) => [p.id, p]));
  for (const p of all) {
    if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(p.occurredAt))
      throw Error("Timestamp requires timezone");
    dateKey(p.occurredAt);
    if (
      p.kind === "revenue" &&
      p.amount !== null &&
      minor(p.amount, p.currency) > 0n &&
      !["completed", "partial", "pending", "canceled"].includes(p.orderState ?? "")
    )
      throw Error("Recognition requires a verified order state");
    if (p.amount !== null && minor(p.amount, p.currency) < 0n)
      throw Error("Use typed adjustments, not negative source amounts");
    if (
      p.kind === "revenue" &&
      p.orderState === "pending" &&
      p.amount !== null &&
      minor(p.amount, p.currency) !== 0n
    )
      throw Error("Pending order cannot recognize revenue");
    if (
      p.kind === "revenue" &&
      p.orderState === "partial" &&
      !p.deliveryVerified
    )
      throw Error("Partial recognition requires delivery evidence");
    if (p.includedIn) {
      const base = index.get(p.includedIn);
      const expected =
        p.kind === "customer_refund"
          ? "revenue"
          : p.kind === "provider_refund"
            ? "provider_cost"
            : null;
      if (
        !base ||
        !expected ||
        base.kind !== expected ||
        base.currency !== p.currency ||
        base.orderId !== p.orderId ||
        dateKey(base.occurredAt) !== dateKey(p.occurredAt) ||
        !base.includedAdjustmentIds?.includes(p.id)
      )
        throw Error("Unverified embedded adjustment");
    }
  }
  const selected = all.filter(
    (p) =>
      p.currency === currency &&
      dateKey(p.occurredAt) >= start &&
      dateKey(p.occurredAt) <= end &&
      !p.includedIn,
  );
  let revenueKnown = ledger.coverage.revenue && ledger.coverage.refunds;
  let costsKnown = ledger.coverage.costs && ledger.coverage.refunds;
  let revenue = 0n,
    cost = 0n,
    cash = 0n,
    other = 0n,
    tax = 0n;
  let cashKnown = ledger.coverage.cash,
    otherKnown = ledger.coverage.nonOperating,
    taxKnown = ledger.coverage.tax;
  for (const p of selected) {
    const amount = p.amount === null ? null : minor(p.amount, currency);
    if (p.kind === "revenue" || p.kind === "customer_refund") {
      if (amount === null) revenueKnown = false;
      else revenue += p.kind === "revenue" ? amount : -amount;
    }
    if (p.kind === "provider_cost" || p.kind === "provider_refund") {
      if (amount === null) costsKnown = false;
      else cost += p.kind === "provider_cost" ? amount : -amount;
    }
    if (["cash_in", "cash_out", "wallet_deposit"].includes(p.kind)) {
      if (amount === null) cashKnown = false;
      else cash += p.kind === "cash_out" ? -amount : amount;
    }
    if (p.kind === "other_income" || p.kind === "other_expense") {
      if (amount === null) otherKnown = false;
      else other += p.kind === "other_income" ? amount : -amount;
    }
    if (p.kind === "tax") {
      if (amount === null) taxKnown = false;
      else tax += amount;
    }
  }
  for (const p of selected.filter(
    (p) =>
      p.kind === "revenue" &&
      p.amount !== null &&
      minor(p.amount, currency) > 0n,
  )) {
    if (
      !p.orderId ||
      !p.allocationId ||
      !all.some(
        (c) =>
          c.kind === "provider_cost" &&
          c.orderId === p.orderId &&
          c.allocationId === p.allocationId &&
          c.currency === currency &&
          c.amount !== null,
      )
    )
      costsKnown = false;
  }
  const ids = new Set<string>();
  let operatingExpenses = 0n;
  for (const e of expenses) {
    if (ids.has(e.id)) throw Error("Duplicate expense");
    ids.add(e.id);
    if (e.currency === currency)
      operatingExpenses += expenseAllocation(e, start, end);
  }
  const gross = revenueKnown && costsKnown ? revenue - cost : null;
  const operating =
    gross !== null && expensesComplete ? gross - operatingExpenses : null;
  const net =
    operating !== null && otherKnown && taxKnown
      ? operating + other - tax
      : null;
  const reasons: string[] = [];
  if (!revenueKnown)
    reasons.push(
      "Recognized revenue/refund coverage is unavailable. Wallet deposits are excluded from sales.",
    );
  if (!costsKnown)
    reasons.push(
      "Attributable historical provider costs or refund coverage are unavailable. Current rates are never substituted.",
    );
  if (!expensesComplete)
    reasons.push("The authenticated expense ledger is not loaded.");
  if (!otherKnown || !taxKnown)
    reasons.push(
      "Non-operating adjustments or taxes are unverified; net profit is unavailable.",
    );
  if (!cashKnown)
    reasons.push(
      "Cash-flow coverage is unavailable; accrual profit is not treated as cash.",
    );
  return {
    currency,
    revenue: revenueKnown ? decimal(revenue, currency) : null,
    providerCosts: costsKnown ? decimal(cost, currency) : null,
    grossProfit: gross === null ? null : decimal(gross, currency),
    expenses: decimal(operatingExpenses, currency),
    operatingProfit: operating === null ? null : decimal(operating, currency),
    netProfit: net === null ? null : decimal(net, currency),
    cashFlow: cashKnown ? decimal(cash, currency) : null,
    margin:
      gross !== null && revenue > 0n
        ? `${decimal((gross * 10000n) / revenue, "USD")}%`
        : null,
    reasons,
  };
}
export function groupProfit(
  ledger: Ledger,
  currency: Currency,
  start: string,
  end: string,
  by: "orderId" | "serviceId" | "providerId",
) {
  const ids = [
    ...new Set(
      ledger.postings.map((p) => p[by]).filter((v): v is string => !!v),
    ),
  ];
  return ids.map((id) => ({
    id,
    ...totals(
      { ...ledger, postings: ledger.postings.filter((p) => p[by] === id) },
      [],
      currency,
      start,
      end,
    ),
  }));
}
export function dailySeries(
  ledger: Ledger,
  expenses: FinancialExpense[],
  currency: Currency,
  start: string,
  end: string,
  expensesComplete = true,
) {
  const count = daysBetween(start, end);
  if (count > 366) throw Error("Chart range must be at most 366 days");
  return Array.from({ length: count }, (_, i) => {
    const date = shiftDate(start, i);
    return {
      date,
      ...totals(ledger, expenses, currency, date, date, expensesComplete),
    };
  });
}
