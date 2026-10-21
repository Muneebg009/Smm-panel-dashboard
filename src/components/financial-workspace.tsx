"use client";
import { useState, useEffect } from "react";
import {
  Download,
  LockKeyhole,
  Plus,
  RefreshCw,
  Pencil,
  History,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  dateKey,
  periods,
  shiftDate,
  REPORTING_TIMEZONE,
} from "@/lib/finance/dates";
import {
  currencyDigits,
  displayMoney,
  minor,
  type Currency,
} from "@/lib/finance/money";
import {
  totals,
  dailySeries,
  groupProfit,
  expenseAllocation,
} from "@/lib/finance/engine";
import {
  unavailableLiveLedger,
  phaseOneDemoLedger,
  demoFinancialExpenses,
} from "@/lib/finance/sources";
import { expenseCategories, type FinancialExpense } from "@/lib/finance/types";
import { csv } from "@/lib/finance/csv";
import { DEMO_TODAY } from "@/lib/data";
import type { ExpenseRecord, ExpenseAudit } from "@/lib/expenses/repository";
const emptyForm = () => ({
  description: "",
  amount: "",
  currency: "PKR" as Currency,
  date: dateKey(new Date()),
  category: "Hosting" as (typeof expenseCategories)[number],
  allocationStart: dateKey(new Date()),
  allocationEnd: dateKey(new Date()),
  status: "active" as "active" | "void",
});
function exportCSV(name: string, rows: (string | number | null)[][]) {
  const url = URL.createObjectURL(
    new Blob([csv(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}
export function FinancialWorkspace({
  view,
}: {
  view: "dashboard" | "reports" | "expenses";
}) {
  const [mode, setMode] = useState<"live" | "demo">("live");
  const [currency, setCurrency] = useState<Currency>("PKR");
  const today = mode === "demo" ? DEMO_TODAY : dateKey(new Date());
  const ranges = periods(today);
  const [start, setStart] = useState(ranges.month.start);
  const [end, setEnd] = useState(today);
  const [comparison, setComparison] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );
  const [authenticated, setAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [createRequestId, setCreateRequestId] = useState("");
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [audit, setAudit] = useState<ExpenseAudit[] | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/admin-session", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setAuthReady(!!data.configured);
          setAuthenticated(!!data.authenticated);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  async function loadExpenses() {
    setBusy(true);
    try {
      const response = await fetch("/api/expenses", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Unable to load expenses.");
      setRecords(data.expenses);
      setLoaded(true);
      setMessage(
        "Authenticated manual expenses loaded. No panel data was requested.",
      );
    } catch (error) {
      setLoaded(false);
      setRecords([]);
      setMessage(
        error instanceof Error ? error.message : "Expense ledger unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/admin-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Paksmart-Action": "finance",
        },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      setPassword("");
      if (!response.ok) throw Error(data.error);
      setAuthenticated(true);
      setMessage("Signed in. Load the expense ledger to view saved entries.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }
  async function saveExpense(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/expenses", {
        method: editing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Paksmart-Action": "finance",
        },
        body: JSON.stringify({
          ...form,
          ...(editing
            ? { id: editing.id, version: editing.version }
            : { createRequestId }),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setOpen(false);
      await loadExpenses();
      setMessage("Expense saved with an immutable before/after audit entry.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  async function showHistory(id: string) {
    setBusy(true);
    try {
      const response = await fetch(
        "/api/expenses?history=" + encodeURIComponent(id),
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setAudit(data.history);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "History unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  const ledger =
    mode === "demo" ? phaseOneDemoLedger() : unavailableLiveLedger();
  const expenses: FinancialExpense[] =
    mode === "demo" ? demoFinancialExpenses : records;
  const complete = mode === "demo" || loaded;
  const safeStart = start && start <= end ? start : end;
  const summary = totals(ledger, expenses, currency, safeStart, end, complete);
  const periodTotal = (range: { start: string; end: string }) =>
    totals(ledger, expenses, currency, range.start, range.end, complete);
  const points = dailySeries(
    ledger,
    expenses,
    currency,
    safeStart,
    end,
    complete,
  );
  const chart = points.map((p) => ({
    date: p.date.slice(5),
    Revenue: p.revenue === null ? null : Number(p.revenue),
    Costs: p.providerCosts === null ? null : Number(p.providerCosts),
    Profit: p.grossProfit === null ? null : Number(p.grossProfit),
  }));
  const kpis = [
    ["Today’s revenue", periodTotal(ranges.today).revenue],
    ["Today’s gross profit", periodTotal(ranges.today).grossProfit],
    ["Yesterday’s profit", periodTotal(ranges.yesterday).grossProfit],
    ["Last 7 days profit", periodTotal(ranges.week).grossProfit],
    ["This month revenue", periodTotal(ranges.month).revenue],
    ["This month gross profit", periodTotal(ranges.month).grossProfit],
    ["This month net profit", periodTotal(ranges.month).netProfit],
    ["Last month profit", periodTotal(ranges.lastMonth).grossProfit],
    ["Provider costs · selected period", summary.providerCosts],
    ["Operating profit · selected period", summary.operatingProfit],
    ["Cash flow · selected period", summary.cashFlow],
  ];
  const currentRange =
    comparison === "daily"
      ? ranges.today
      : comparison === "weekly"
        ? ranges.week
        : ranges.month;
  const previousRange =
    comparison === "daily"
      ? ranges.yesterday
      : comparison === "weekly"
        ? { start: shiftDate(today, -13), end: shiftDate(today, -7) }
        : ranges.lastMonth;
  const current = periodTotal(currentRange),
    previous = periodTotal(previousRange);
  const ranking = groupProfit(
    ledger,
    currency,
    safeStart,
    end,
    "serviceId",
  ).sort((a, b) => {
    if (a.grossProfit === null) return 1;
    if (b.grossProfit === null) return -1;
    const left = minor(a.grossProfit, currency),
      right = minor(b.grossProfit, currency);
    return left === right ? 0 : left > right ? -1 : 1;
  });
  function changeMode(value: "live" | "demo") {
    setMode(value);
    const now = value === "demo" ? DEMO_TODAY : dateKey(new Date());
    setStart(periods(now).month.start);
    setEnd(now);
  }
  function exportReport() {
    exportCSV(`financial-${mode}-${currency}-${safeStart}-${end}`, [
      [
        mode === "demo"
          ? "DEMO DATA — existing Phase 1 fixtures"
          : "LIVE DATA UNAVAILABLE — no verified API financial fields",
      ],
      ["Reporting timezone", REPORTING_TIMEZONE],
      ["Currency", currency],
      [
        "Date",
        "Recognized revenue",
        "Provider costs",
        "Gross profit",
        "Operating expenses",
        "Operating profit",
        "Net profit",
        "Cash flow",
      ],
      ...points.map((p) => [
        p.date,
        p.revenue,
        p.providerCosts,
        p.grossProfit,
        complete ? p.expenses : null,
        p.operatingProfit,
        p.netProfit,
        p.cashFlow,
      ]),
    ]);
  }
  const controls = (
    <div className="finance-toolbar">
      <div className="period-tabs" aria-label="Financial data source">
        <button
          className={mode === "live" ? "active" : ""}
          onClick={() => changeMode("live")}
        >
          Live financials
        </button>
        <button
          className={mode === "demo" ? "active" : ""}
          onClick={() => changeMode("demo")}
        >
          DEMO DATA
        </button>
      </div>
      <select
        aria-label="Financial currency"
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
      >
        {Object.keys(currencyDigits).map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <div className="date-inputs">
        <input
          aria-label="Financial start date"
          type="date"
          value={start}
          min={shiftDate(end, -365)}
          max={end}
          onChange={(e) => {
            if (
              e.target.value &&
              e.target.value <= end &&
              e.target.value >= shiftDate(end, -365)
            )
              setStart(e.target.value);
          }}
        />
        <span>—</span>
        <input
          aria-label="Financial end date"
          type="date"
          value={end}
          min={start}
          max={shiftDate(start, 365)}
          onChange={(e) => {
            if (
              e.target.value &&
              e.target.value >= start &&
              e.target.value <= shiftDate(start, 365)
            )
              setEnd(e.target.value);
          }}
        />
      </div>
    </div>
  );
  const authentication = (
    <Card>
      <CardHeader>
        <CardTitle>
          <LockKeyhole size={16} /> Administrator expense access
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!authenticated ? (
          <>
            <p className="muted">
              Manual business expenses are private. A server-configured
              administrator password and session secret are required.
            </p>
            <form onSubmit={login} className="finance-login">
              <label>
                Administrator password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={16}
                  maxLength={1024}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <Button type="submit" disabled={busy || !authReady}>
                Sign in
              </Button>
            </form>
            {!authReady && (
              <p className="fine-print muted">
                Authentication is not configured or has not been checked. See
                the Phase 3 setup instructions. Never enter a Perfect Panel API
                key here.
              </p>
            )}
          </>
        ) : (
          <div className="integration-actions">
            <Button variant="outline" disabled={busy} onClick={loadExpenses}>
              <RefreshCw size={15} />
              Load saved expenses
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                await fetch("/api/admin-session", {
                  method: "DELETE",
                  headers: { "X-Paksmart-Action": "finance" },
                });
                setAuthenticated(false);
                setRecords([]);
                setLoaded(false);
              }}
            >
              Sign out
            </Button>
            {view === "expenses" && (
              <Button
                disabled={busy || !loaded}
                onClick={() => {
                  setEditing(null);
                  setCreateRequestId(crypto.randomUUID());
                  setForm(emptyForm());
                  setOpen(true);
                }}
              >
                <Plus size={15} />
                Add business expense
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
  return (
    <div className="financial-workspace">
      <div className="finance-title">
        <div>
          <h2>
            {view === "expenses"
              ? "Business expense ledger"
              : view === "reports"
                ? "Advanced financial reports"
                : "Financial dashboard"}
          </h2>
          <p>
            {REPORTING_TIMEZONE} · Separate currencies · Historical ledger
            amounts
          </p>
        </div>
        <span className={`badge ${mode === "demo" ? "purple" : "pending"}`}>
          {mode === "demo" ? "DEMO DATA" : "LIVE DATA UNAVAILABLE"}
        </span>
      </div>
      {view !== "expenses" && controls}
      {view === "expenses" && (
        <p className="integration-message">
          Manual entries are actual administrator-entered expenses, kept
          separate from DEMO DATA. No Perfect Panel account is modified. Amounts
          are not panel-verified.
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {(view === "expenses" || mode === "live") && authentication}
      {view !== "expenses" && (
        <>
          <Card>
            <CardContent>
              <p className="financial-sync">
                Financial last sync:{" "}
                <strong>
                  {ledger.lastSyncAt ??
                    "Never — no verified financial API sync"}
                </strong>
              </p>
              <p className="fine-print muted">
                {mode === "demo"
                  ? "Existing Phase 1 demo fixtures only. No new simulated earnings are generated. Net profit and cash flow are unavailable where their components are not known."
                  : "No Phase 2 financial endpoint or historical cost field has been verified. Unknown amounts stay unavailable. Wallet deposits never count as sales. Manual expenses are shown only after authenticated loading."}
              </p>
            </CardContent>
          </Card>
          <div className="stats-grid">
            {kpis.map(([label, value]) => (
              <Card className="stat finance-stat" key={label}>
                <div className="stat-label">{label}</div>
                <strong>{displayMoney(value, currency)}</strong>
                <small className="muted">
                  {mode === "demo"
                    ? "DEMO DATA"
                    : "Verified live amounts unavailable"}
                </small>
              </Card>
            ))}
            <Card className="stat">
              <div className="stat-label">Gross margin · selected period</div>
              <strong>{summary.margin ?? "Unavailable"}</strong>
              <small className="muted">Not an estimate</small>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Revenue, provider costs & gross profit</CardTitle>
                <p>
                  {safeStart} — {end} · {currency} · exact decimals retained in
                  tables and CSV
                </p>
              </div>
              <Button variant="outline" onClick={exportReport}>
                <Download size={15} />
                Export financial CSV
              </Button>
            </CardHeader>
            {summary.revenue === null ? (
              <div className="empty">
                Chart unavailable: verified financial postings are missing.
              </div>
            ) : (
              <div className="financial-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "var(--muted)", fontSize: 10 }}
                    />
                    <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="Revenue"
                      fill="#7866ff"
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="Costs"
                      fill="#4da7ff"
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="Profit"
                      fill="#37c9a0"
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <div className="lower-grid">
            <Card>
              <CardHeader>
                <CardTitle>Income statement · {currency}</CardTitle>
              </CardHeader>
              <CardContent>
                {[
                  ["Recognized revenue, net of refunds", summary.revenue],
                  [
                    "Attributable provider cost, net of refunds",
                    summary.providerCosts,
                  ],
                  ["Gross profit", summary.grossProfit],
                  [
                    "Allocated operating expenses",
                    complete ? summary.expenses : null,
                  ],
                  ["Operating profit", summary.operatingProfit],
                  [
                    "Net profit (after non-operating items/taxes)",
                    summary.netProfit,
                  ],
                  ["Cash flow (separate ledger)", summary.cashFlow],
                ].map(([label, value]) => (
                  <div className="statement-row" key={label}>
                    <span>{label}</span>
                    <strong>{displayMoney(value, currency)}</strong>
                  </div>
                ))}
                {summary.reasons.map((reason) => (
                  <p className="fine-print muted" key={reason}>
                    {reason}
                  </p>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Expense breakdown · selected period</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseCategories.map((category) => {
                  const amount = expenses
                    .filter(
                      (e) => e.category === category && e.currency === currency,
                    )
                    .reduce(
                      (sum, e) => sum + expenseAllocation(e, safeStart, end),
                      0n,
                    );
                  const digits = currencyDigits[currency];
                  const raw = amount.toString().padStart(digits + 1, "0");
                  const formatted = digits
                    ? raw.slice(0, -digits) + "." + raw.slice(-digits)
                    : raw;
                  return (
                    <div className="financial-row" key={category}>
                      <span>{category}</span>
                      <strong>
                        {complete
                          ? displayMoney(formatted, currency)
                          : "Unavailable"}
                      </strong>
                    </div>
                  );
                })}
                <p className="fine-print muted">
                  Allocated by service period, not cash payment date. No
                  currency conversion is performed.
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Period comparison</CardTitle>
                <p>
                  Full calendar months vs rolling 7-day periods; daily periods
                  use local dates.
                </p>
              </div>
              <select
                aria-label="Comparison period"
                value={comparison}
                onChange={(e) =>
                  setComparison(e.target.value as typeof comparison)
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </CardHeader>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Revenue</th>
                    <th>Gross profit</th>
                    <th>Operating profit</th>
                    <th>Net profit</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [`${currentRange.start} — ${currentRange.end}`, current],
                    [`${previousRange.start} — ${previousRange.end}`, previous],
                  ].map(([label, total]) => {
                    const t = total as typeof summary;
                    return (
                      <tr key={String(label)}>
                        <td>{String(label)}</td>
                        <td>{displayMoney(t.revenue, currency)}</td>
                        <td>{displayMoney(t.grossProfit, currency)}</td>
                        <td>{displayMoney(t.operatingProfit, currency)}</td>
                        <td>{displayMoney(t.netProfit, currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                Profitable services ·{" "}
                {mode === "demo" ? "DEMO DATA" : "Unavailable"}
              </CardTitle>
            </CardHeader>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Revenue</th>
                    <th>Historical provider costs</th>
                    <th>Gross profit</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((s) => (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td>{displayMoney(s.revenue, currency)}</td>
                      <td>{displayMoney(s.providerCosts, currency)}</td>
                      <td>{displayMoney(s.grossProfit, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!ranking.length && (
                <div className="empty">
                  No verified order/service/provider mapping is available.
                </div>
              )}
            </div>
          </Card>
          <FinancialDetails
            ledger={ledger}
            currency={currency}
            start={safeStart}
            end={end}
          />
        </>
      )}
      {view === "expenses" && (
        <>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Saved manual expenses</CardTitle>
                <p>
                  Durable storage · optimistic edit versioning · immutable audit
                  entries
                </p>
              </div>
              {loaded && (
                <Button
                  variant="outline"
                  onClick={() =>
                    exportCSV("manual-business-expenses", [
                      [
                        "MANUAL BUSINESS EXPENSES — administrator entered, not panel-verified",
                      ],
                      [
                        "Date",
                        "Currency",
                        "Amount",
                        "Category",
                        "Description",
                        "Allocation start",
                        "Allocation end",
                        "Status",
                        "Version",
                      ],
                      ...records.map((e) => [
                        e.date,
                        e.currency,
                        e.amount,
                        e.category,
                        e.description,
                        e.allocationStart,
                        e.allocationEnd,
                        e.status,
                        e.version,
                      ]),
                    ])
                  }
                >
                  <Download size={15} />
                  Export expense CSV
                </Button>
              )}
            </CardHeader>
            <div className="table-toolbar">
              <input
                aria-label="Search saved expenses"
                placeholder="Search description or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Allocation</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records
                    .filter((e) =>
                      `${e.description} ${e.category}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((e) => (
                      <tr key={e.id}>
                        <td>{e.date}</td>
                        <td>{e.description}</td>
                        <td>{e.category}</td>
                        <td>{displayMoney(e.amount, e.currency)}</td>
                        <td>
                          {e.allocationStart} — {e.allocationEnd}
                        </td>
                        <td>{e.status}</td>
                        <td>{e.version}</td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`Edit expense ${e.description}`}
                            disabled={busy}
                            onClick={() => {
                              setEditing(e);
                              setForm(e);
                              setOpen(true);
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`History for ${e.description}`}
                            disabled={busy}
                            onClick={() => showHistory(e.id)}
                          >
                            <History size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!records.length && (
                <div className="empty">
                  {loaded
                    ? "No saved expenses."
                    : "Sign in and load the ledger. No sample expenses are inserted."}
                </div>
              )}
            </div>
          </Card>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogTitle>
                {editing ? "Edit business expense" : "Add business expense"}
              </DialogTitle>
              <DialogDescription>
                Only this application’s expense ledger is changed. The live
                panel is untouched.
              </DialogDescription>
              <form className="settings-form" onSubmit={saveExpense}>
                <label>
                  Description
                  <input
                    required
                    maxLength={500}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </label>
                <div className="finance-form-row">
                  <label>
                    Amount
                    <input
                      required
                      inputMode="decimal"
                      pattern="[0-9]+([.][0-9]+)?"
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Currency
                    <select
                      value={form.currency}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          currency: e.target.value as Currency,
                        })
                      }
                    >
                      {Object.keys(currencyDigits).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Expense date
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </label>
                <label>
                  Category
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as typeof form.category,
                      })
                    }
                  >
                    {expenseCategories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <div className="finance-form-row">
                  <label>
                    Allocation start
                    <input
                      required
                      type="date"
                      max={form.allocationEnd}
                      value={form.allocationStart}
                      onChange={(e) =>
                        setForm({ ...form, allocationStart: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Allocation end
                    <input
                      required
                      type="date"
                      min={form.allocationStart}
                      value={form.allocationEnd}
                      onChange={(e) =>
                        setForm({ ...form, allocationEnd: e.target.value })
                      }
                    />
                  </label>
                </div>
                {editing && (
                  <label>
                    Status
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          status: e.target.value as "active" | "void",
                        })
                      }
                    >
                      <option value="active">Active</option>
                      <option value="void">Void (retain history)</option>
                    </select>
                  </label>
                )}
                <Button type="submit" disabled={busy}>
                  Save expense
                </Button>
                {message && (
                  <p className="muted" role="status">
                    {message}
                  </p>
                )}
              </form>
            </DialogContent>
          </Dialog>
          <Dialog
            open={audit !== null}
            onOpenChange={(value) => {
              if (!value) setAudit(null);
            }}
          >
            <DialogContent>
              <DialogTitle>Expense edit history</DialogTitle>
              <DialogDescription>
                Append-only before/after records; administrator identity and
                server timestamps.
              </DialogDescription>
              {audit?.map((a) => (
                <div className="audit-entry" key={a.id}>
                  <strong>
                    Version {a.after.version} · {a.action}
                  </strong>
                  <p>
                    {a.at} · {a.actor}
                  </p>
                  <dl>
                    {[
                      "description",
                      "amount",
                      "currency",
                      "date",
                      "category",
                      "allocationStart",
                      "allocationEnd",
                      "status",
                    ].map((k) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>
                          {a.before
                            ? String(a.before[k as keyof ExpenseRecord])
                            : "—"}{" "}
                          → {String(a.after[k as keyof ExpenseRecord])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
function FinancialDetails({
  ledger,
  currency,
  start,
  end,
}: {
  ledger: ReturnType<typeof unavailableLiveLedger>;
  currency: Currency;
  start: string;
  end: string;
}) {
  const [group, setGroup] = useState<"orderId" | "providerId">("orderId");
  const rows = groupProfit(ledger, currency, start, end, group);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical order and provider profit</CardTitle>
        <select
          aria-label="Profit grouping"
          value={group}
          onChange={(e) => setGroup(e.target.value as typeof group)}
        >
          <option value="orderId">By order</option>
          <option value="providerId">By provider</option>
        </select>
      </CardHeader>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Revenue, net of refunds</th>
              <th>Costs, net of refunds</th>
              <th>Gross profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{displayMoney(row.revenue, currency)}</td>
                <td>{displayMoney(row.providerCosts, currency)}</td>
                <td>{displayMoney(row.grossProfit, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">
            Unavailable: no verified historical order/cost postings.
          </div>
        )}
      </div>
    </Card>
  );
}
