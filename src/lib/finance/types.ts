import type { Currency } from "./money";
export type PostingKind =
  | "revenue"
  | "provider_cost"
  | "customer_refund"
  | "provider_refund"
  | "wallet_deposit"
  | "cash_in"
  | "cash_out"
  | "other_income"
  | "other_expense"
  | "tax";
/** INTERNAL ledger contract, not claimed Perfect Panel response fields.
 * Amounts are immutable historical postings, never current catalog rates.
 */
export interface Posting {
  id: string;
  transactionId: string;
  kind: PostingKind;
  occurredAt: string;
  currency: Currency;
  amount: string | null;
  orderId?: string;
  serviceId?: string;
  providerId?: string;
  allocationId?: string;
  orderState?: "completed" | "partial" | "pending" | "canceled";
  deliveryVerified?: boolean;
  // An adjustment already embedded in a net source posting must cross-reference it.
  includedIn?: string;
  includedAdjustmentIds?: string[];
}
export const expenseCategories = [
  "Hosting",
  "Domain",
  "Advertising",
  "Staff",
  "Payment Processing",
  "Other Expenses",
] as const;
export interface FinancialExpense {
  id: string;
  date: string;
  amount: string;
  currency: Currency;
  category: (typeof expenseCategories)[number];
  description: string;
  allocationStart: string;
  allocationEnd: string;
  status: "active" | "void";
}
export interface Ledger {
  source: "demo" | "live";
  postings: Posting[];
  coverage: {
    revenue: boolean;
    costs: boolean;
    refunds: boolean;
    cash: boolean;
    nonOperating: boolean;
    tax: boolean;
  };
  lastSyncAt: string | null;
}
export interface FinancialTotals {
  currency: Currency;
  revenue: string | null;
  providerCosts: string | null;
  grossProfit: string | null;
  expenses: string;
  operatingProfit: string | null;
  netProfit: string | null;
  cashFlow: string | null;
  margin: string | null;
  reasons: string[];
}
