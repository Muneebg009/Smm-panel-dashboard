"use client";
import { useState } from "react";
import { ShieldCheck, RefreshCw, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { IntegrationReport } from "@/lib/perfect-panel/capabilities";
export function PerfectPanelIntegration() {
  const [report, setReport] = useState<IntegrationReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function check(action: "status" | "test" | "refresh") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/perfect-panel",
        action === "status"
          ? { cache: "no-store" }
          : {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Paksmart-Action": "read-only",
              },
              body: JSON.stringify({ action }),
              cache: "no-store",
            },
      );
      if (!response.ok && response.status !== 409) throw Error();
      const data = (await response.json()) as IntegrationReport;
      if (!Array.isArray(data.capabilities) || typeof data.message !== "string")
        throw Error();
      setReport(data);
    } catch {
      setError(
        "Unable to read integration status. No successful sync is confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }
  const state = error
    ? "Error"
    : report?.state === "connected"
      ? "Connected"
      : report?.state === "error"
        ? "Error"
        : "Not Connected";
  return (
    <Card className="integration-card">
      <CardHeader>
        <div>
          <CardTitle>Perfect Panel Admin API v2</CardTitle>
          <p>Phase 2 · Read-only integration capability report</p>
        </div>
        <span
          className={`badge ${state === "Connected" ? "completed" : state === "Error" ? "canceled" : "pending"}`}
        >
          {state}
        </span>
      </CardHeader>
      <CardContent>
        <div className="integration-actions">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => check("status")}
          >
            <ShieldCheck size={15} />
            Check configuration
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => check("test")}
          >
            <PlugZap size={15} />
            Test connection
          </Button>
          <Button disabled={busy} onClick={() => check("refresh")}>
            <RefreshCw size={15} className={busy ? "spinning" : ""} />
            {busy ? "Checking…" : "Refresh Data"}
          </Button>
        </div>
        <div className="integration-message" role="status">
          {error ||
            report?.message ||
            "Live data unavailable. Official endpoints and production API base have not been verified. All existing page figures remain DEMO DATA."}
        </div>
        {report && (
          <>
            <div className="integration-facts">
              <span>
                API key:{" "}
                <strong>
                  {report.credentialsConfigured
                    ? "Configured server-side"
                    : "Not configured"}
                </strong>
              </span>
              <span>
                Panel origin:{" "}
                <strong>
                  {report.baseUrlConfigured ? "Configured" : "Not configured"}
                </strong>
              </span>
              <span>
                Verified endpoints:{" "}
                <strong>{report.verifiedEndpointCount}</strong>
              </span>
              <span>
                Last attempt:{" "}
                <strong>
                  {report.lastAttemptAt
                    ? new Date(report.lastAttemptAt).toLocaleString("en-PK", {
                        timeZone: "Asia/Karachi",
                      })
                    : "Not attempted"}
                </strong>
              </span>
              <span>
                Last successful sync: <strong>Never</strong>
              </span>
              <span>
                Panel requests made: <strong>{report.remoteRequests}</strong>
              </span>
            </div>
            <div className="capability-list">
              {report.capabilities.map((c) => (
                <div key={c.id}>
                  <strong>
                    {c.label}
                    <span className="badge pending">Unverified</span>
                  </strong>
                  <p>{c.reason}</p>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="fine-print muted">
          No automatic sync. No order changes, pulls, refills, payments or
          service testing. Adding a credential alone will not enable unverified
          endpoints. Live financial totals remain unavailable; demo totals stay
          separate.
        </p>
      </CardContent>
    </Card>
  );
}
