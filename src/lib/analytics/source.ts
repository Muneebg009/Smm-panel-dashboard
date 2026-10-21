import { demo } from "../data";
import { minor, decimal } from "../finance/money";
import { phaseOneDemoLedger, unavailableLiveLedger } from "../finance/sources";
import type { AnalyticsSource } from "./types";
/** Fixture adapter ONLY, never an invented Perfect Panel response schema. */
export function analyticsSource(mode: "live" | "demo"): AnalyticsSource {
  if (mode === "live")
    return {
      mode,
      available: false,
      orders: [],
      services: [],
      providers: [],
      ledger: unavailableLiveLedger(),
      reason:
        "No Phase 2 order, service, provider, history or financial endpoint/schema has been verified. Live metrics are unavailable, not zero.",
    };
  return {
    mode,
    available: true,
    orders: demo.orders.map((o) => ({
      id: o.id,
      serviceId: o.serviceId,
      providerId: demo.services.find((s) => s.id === o.serviceId)!.providerId,
      providerSource: "demo",
      customer: o.customer,
      quantity: o.quantity,
      status: o.status,
      createdAt: o.date + "T12:00:00+05:00",
      currency: "PKR",
      sellingPrice: decimal(
        (minor(String(o.sellPer1000), "PKR") * BigInt(o.quantity)) / 1000n,
        "PKR",
      ),
      historicalCost: decimal(
        (minor(String(o.costPer1000), "PKR") * BigInt(o.quantity)) / 1000n,
        "PKR",
      ),
      costBasis: "snapshot-quote",
      statusHistory: null,
    })),
    services: demo.services.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.platform,
      providerId: s.providerId,
      providerSource: "demo",
      currency: "PKR",
      sellingRate: decimal(minor(String(s.sellPer1000), "PKR"), "PKR"),
      providerRate: decimal(minor(String(s.costPer1000), "PKR"), "PKR"),
      rateUnit: 1000,
      status: null,
      imported: null,
    })),
    providers: demo.providers.map((p) => ({
      id: p.id,
      name: p.name,
      source: "demo",
    })),
    ledger: phaseOneDemoLedger(),
    reason:
      "DEMO DATA — existing Phase 1 fixtures only. Category uses the fixture platform label. Import flags, service status and status histories were not supplied. Financials reuse Phase 3 recognized postings.",
  };
}
