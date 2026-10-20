import "server-only";
import { createReport, verifiedOperations } from "./capabilities";
import { createReadOnlyClient, validateConfig } from "./client-core";

// These names must NEVER be prefixed with NEXT_PUBLIC_. No secret enters props.
export function connectionReport(attemptedAt?: string) {
  const baseUrl = process.env.PERFECT_PANEL_BASE_URL ?? "";
  const apiKey = process.env.PERFECT_PANEL_ADMIN_API_KEY ?? "";
  let configurationError = false;
  if (baseUrl && apiKey) {
    try {
      validateConfig({ baseUrl, apiKey });
    } catch {
      configurationError = true;
    }
  }
  return createReport({
    keyPresent: !!apiKey,
    basePresent: !!baseUrl,
    configurationError,
    attemptedAt,
  });
}
export function createServerPanelClient() {
  return createReadOnlyClient(
    {
      baseUrl: process.env.PERFECT_PANEL_BASE_URL ?? "",
      apiKey: process.env.PERFECT_PANEL_ADMIN_API_KEY ?? "",
    },
    verifiedOperations,
  );
}
export async function testConnection() {
  // No probe is allowed until a specific documented non-mutating operation exists.
  // Missing docs are a capability blocker, not a failed credential test.
  return connectionReport(new Date().toISOString());
}
export async function refreshData() {
  // No mock-to-live adapter, paging loop or authentication probe is guessed here.
  return connectionReport(new Date().toISOString());
}
