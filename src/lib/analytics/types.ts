import type { Currency } from "../finance/money";
import type { Ledger } from "../finance/types";
export const orderStatuses = [
  "Completed",
  "Pending",
  "Partial",
  "Canceled",
  "Processing",
  "Unknown",
] as const;
export type AnalyticsStatus = (typeof orderStatuses)[number];
export interface AnalyticsOrder {
  id: string;
  serviceId: string | null;
  providerId: string | null;
  providerSource: "verified" | "manual" | "demo" | null;
  customer: string | null;
  quantity: number | null;
  status: AnalyticsStatus;
  createdAt: string;
  currency: Currency;
  sellingPrice: string | null;
  historicalCost: string | null;
  costBasis: "snapshot-quote" | "verified-incurred" | null;
  statusHistory: { at: string; status: AnalyticsStatus }[] | null;
}
export interface AnalyticsService {
  id: string;
  name: string;
  category: string | null;
  providerId: string | null;
  providerSource: "verified" | "manual" | "demo" | null;
  currency: Currency;
  sellingRate: string | null;
  providerRate: string | null;
  rateUnit: number | null;
  status: string | null;
  imported: boolean | null;
}
export interface AnalyticsProvider {
  id: string;
  name: string;
  source: "verified" | "manual" | "demo";
}
export interface AnalyticsSource {
  mode: "live" | "demo";
  available: boolean;
  orders: AnalyticsOrder[];
  services: AnalyticsService[];
  providers: AnalyticsProvider[];
  ledger: Ledger;
  reason: string;
}
export interface ProviderMapping {
  id: string;
  serviceId: string;
  providerId: string;
  providerName: string;
  validFrom: string;
  validTo: string | null;
  note: string;
  active: boolean;
  version: number;
  createdAt: string;
}
export type Ranking =
  "quantity" | "revenue" | "profit" | "low-margin" | "loss" | "canceled";
export interface AnalyticsQuery {
  mode: "live" | "demo";
  view: "orders" | "services" | "rankings" | "providers";
  start: string;
  end: string;
  currency: Currency;
  search: string;
  status: AnalyticsStatus | "All";
  category: string;
  provider: string;
  serviceStatus: string;
  sort:
    | "date-desc"
    | "date-asc"
    | "name"
    | "revenue"
    | "profit"
    | "cost"
    | "margin";
  ranking: Ranking;
  page: number;
  pageSize: number;
}
export interface OrderRow extends AnalyticsOrder {
  serviceName: string | null;
  providerName: string | null;
  recognizedRevenue: string | null;
  providerCosts: string | null;
  grossProfit: string | null;
  margin: string | null;
}
export interface AggregateRow {
  id: string;
  name: string;
  category: string | null;
  providerId: string | null;
  providerName: string | null;
  providerSource: "verified" | "manual" | "demo" | null;
  orderCount: number;
  quantity: number | null;
  completed: number;
  pending: number;
  processing: number;
  partial: number;
  canceled: number;
  completionRate: string | null;
  cancellationRate: string | null;
  pendingRate: string | null;
  financialSample: number;
  connectedServices: number;
  revenue: string | null;
  providerCosts: string | null;
  grossProfit: string | null;
  margin: string | null;
  sellingRate: string | null;
  providerRate: string | null;
  rateMargin: string | null;
  rateUnit: number | null;
  status: string | null;
  imported: boolean | null;
}
export interface AnalyticsResult {
  mode: "live" | "demo";
  available: boolean;
  reason: string;
  currency: Currency;
  start: string;
  end: string;
  counts: Record<AnalyticsStatus | "Total", number | null>;
  categories: string[];
  providerOptions: { id: string; name: string }[];
  rows: (OrderRow | AggregateRow)[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  insights: { kind: string; reference: string; message: string }[];
  chart: { name: string; orders: number; canceled: number }[];
  manualMappings: number;
  unmappedOrders: number | null;
}
