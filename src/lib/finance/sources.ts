import { demo } from "@/lib/data";
import { decimal, minor, prorate } from "./money";
import type { FinancialExpense, Ledger, Posting } from "./types";
export function unavailableLiveLedger(): Ledger {
  return {
    source: "live",
    postings: [],
    coverage: {
      revenue: false,
      costs: false,
      refunds: false,
      cash: false,
      nonOperating: false,
      tax: false,
    },
    lastSyncAt: null,
  };
}
/** Reuses existing Phase 1 fixtures ONLY. This is not an API mapper. */
export function phaseOneDemoLedger(): Ledger {
  const postings: Posting[] = demo.orders
    .filter((o) => o.status === "Completed")
    .flatMap((o) => {
      const base = {
        orderId: o.id,
        serviceId: o.serviceId,
        providerId: demo.services.find((s) => s.id === o.serviceId)!.providerId,
        allocationId: o.id,
        occurredAt: o.date + "T12:00:00+05:00",
        currency: "PKR" as const,
        orderState: "completed" as const,
      };
      return [
        {
          ...base,
          id: o.id + "-sale",
          transactionId: o.id + "-sale",
          kind: "revenue" as const,
          amount: decimal(
            (minor(String(o.sellPer1000), "PKR") * BigInt(o.quantity)) / 1000n,
            "PKR",
          ),
        },
        {
          ...base,
          id: o.id + "-cost",
          transactionId: o.id + "-cost",
          kind: "provider_cost" as const,
          amount: decimal(
            (minor(String(o.costPer1000), "PKR") * BigInt(o.quantity)) / 1000n,
            "PKR",
          ),
        },
      ];
    });
  return {
    source: "demo",
    postings,
    coverage: {
      revenue: true,
      costs: true,
      refunds: true,
      cash: false,
      nonOperating: false,
      tax: false,
    },
    lastSyncAt: null,
  };
}
export const demoFinancialExpenses: FinancialExpense[] = demo.expenses.map(
  (e) => ({
    id: e.id,
    date: e.date,
    amount: prorate(String(e.amount), 1, 1, "PKR"),
    currency: "PKR",
    category:
      e.category === "Infrastructure"
        ? "Hosting"
        : e.category === "Marketing"
          ? "Advertising"
          : "Other Expenses",
    description: e.name,
    allocationStart: e.date,
    allocationEnd: e.date,
    status: "active",
  }),
);
