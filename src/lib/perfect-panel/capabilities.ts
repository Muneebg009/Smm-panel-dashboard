/** No endpoint is authorized until its official method, semantics and schema are reviewed. */
export interface VerifiedReadOperation<T = unknown> {
  id: string;
  method: "GET";
  path: string;
  evidence: { documentationUrl: string; reviewedAt: string; readOnly: true };
  parse: (value: unknown) => T;
}
// Deliberately empty: the documentation host was denied by the cloud egress policy.
// Do not add guessed /orders, /services, /users, /payments, or "pull" operations.
export const verifiedOperations: readonly VerifiedReadOperation[] =
  Object.freeze([]);
export const capabilities = [
  {
    id: "connection",
    label: "Safe connection test",
    reason: "No documented non-mutating operation verified.",
  },
  {
    id: "orders",
    label: "Orders",
    reason: "Endpoint, pagination, status values and order schema unverified.",
  },
  {
    id: "services",
    label: "Services",
    reason: "Endpoint, rate units, currency and service schema unverified.",
  },
  {
    id: "customers",
    label: "Customers",
    reason: "Endpoint, access scope and customer schema unverified.",
  },
  {
    id: "payments",
    label: "Payments",
    reason: "Endpoint, payment state, currency and schema unverified.",
  },
  {
    id: "financials",
    label: "Revenue, provider costs and profit",
    reason:
      "Historical prices, settled revenue and provider costs are unverified. Live totals unavailable.",
  },
] as const;
export type ConnectionState = "connected" | "not_connected" | "error";
export interface IntegrationReport {
  state: ConnectionState;
  message: string;
  credentialsConfigured: boolean;
  baseUrlConfigured: boolean;
  productionApiBaseVerified: false;
  verifiedEndpointCount: number;
  capabilities: {
    id: string;
    label: string;
    state: "unverified";
    reason: string;
  }[];
  lastAttemptAt: string | null;
  lastSuccessfulSyncAt: null;
  liveDataAvailable: false;
  automaticSync: false;
  remoteRequests: 0;
}
export function createReport(input: {
  keyPresent: boolean;
  basePresent: boolean;
  configurationError?: boolean;
  attemptedAt?: string;
}): IntegrationReport {
  return {
    state: input.configurationError ? "error" : "not_connected",
    message: input.configurationError
      ? "Server configuration is invalid. No panel request was made."
      : "Blocked: official read-only endpoint documentation and production API base require verification. No panel request was made.",
    credentialsConfigured: input.keyPresent,
    baseUrlConfigured: input.basePresent,
    productionApiBaseVerified: false,
    verifiedEndpointCount: verifiedOperations.length,
    capabilities: capabilities.map((c) => ({ ...c, state: "unverified" })),
    lastAttemptAt: input.attemptedAt ?? null,
    lastSuccessfulSyncAt: null,
    liveDataAvailable: false,
    automaticSync: false,
    remoteRequests: 0,
  };
}
