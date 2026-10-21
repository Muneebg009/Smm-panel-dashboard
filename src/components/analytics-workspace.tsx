"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Search,
  RefreshCw,
  LockKeyhole,
  ArrowUpRight,
  Plus,
  History,
  Link2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
import { dateKey, shiftDate, REPORTING_TIMEZONE } from "@/lib/finance/dates";
import {
  displayMoney,
  currencyDigits,
  minor,
  type Currency,
} from "@/lib/finance/money";
import { DEMO_TODAY } from "@/lib/data";
import {
  orderStatuses,
  type AnalyticsResult,
  type AnalyticsQuery,
  type OrderRow,
  type AggregateRow,
  type ProviderMapping,
} from "@/lib/analytics/types";
const rankingNames = {
  quantity: "Best-selling · ordered units",
  revenue: "Highest recognized revenue",
  profit: "Most profitable",
  "low-margin": "Lowest gross margin",
  loss: "Loss-making services",
  canceled: "Most canceled · order count",
};
const titles = {
  orders: "Advanced order analytics",
  services: "Imported service catalog",
  rankings: "Top 20 service rankings",
  providers: "Provider performance",
};
const value = (v: string | number | null | undefined) =>
  v === null || v === undefined ? "Unavailable" : String(v);
export function AnalyticsWorkspace({ view }: { view: AnalyticsQuery["view"] }) {
  const [mode, setMode] = useState<"live" | "demo">("live");
  const [currency, setCurrency] = useState<Currency>("PKR");
  const [start, setStart] = useState(() => shiftDate(dateKey(new Date()), -29));
  const [end, setEnd] = useState(() => dateKey(new Date()));
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const [provider, setProvider] = useState("All");
  const [serviceStatus, setServiceStatus] = useState("All");
  const [sort, setSort] = useState("date-desc");
  const [ranking, setRanking] = useState("quantity");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reload, setReload] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [responseData, setResponseData] = useState<{
    result: AnalyticsResult;
    query: string;
  } | null>(null);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let active = true;
    fetch("/api/admin-session", { cache: "no-store" })
      .then((r) => r.json())
      .then((result) => {
        if (active) {
          setAuthenticated(!!result.authenticated);
          setConfigured(!!result.configured);
          setAuthChecked(true);
        }
      })
      .catch(() => {
        if (active) {
          setAuthChecked(true);
          setMessage(
            "Session status is unavailable. Retry by reloading this page.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const query = useMemo(
    () =>
      new URLSearchParams({
        mode,
        view,
        currency,
        start,
        end,
        search: term,
        status,
        category,
        provider,
        serviceStatus,
        sort,
        ranking,
        page: String(page),
        pageSize: String(pageSize),
      }).toString(),
    [
      mode,
      view,
      currency,
      start,
      end,
      term,
      status,
      category,
      provider,
      serviceStatus,
      sort,
      ranking,
      page,
      pageSize,
    ],
  );
  const data = responseData?.query === query ? responseData.result : null;
  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      setResponseData(null);
      setMessage("");
      try {
        const response = await fetch("/api/analytics?" + query, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!active) return;
        if (response.status === 401) {
          setAuthenticated(false);
          throw Error("Session expired. Sign in again.");
        }
        if (!response.ok) throw Error(result.error || "Analytics unavailable.");
        setResponseData({ result, query });
      } catch (error) {
        if (active)
          setMessage(
            error instanceof Error ? error.message : "Analytics unavailable.",
          );
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [authenticated, query, reload]);
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Paksmart-Action": "finance",
        },
        body: JSON.stringify({ password }),
      });
      setPassword("");
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setAuthenticated(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }
  function changeMode(next: "live" | "demo") {
    setMode(next);
    const today = next === "demo" ? DEMO_TODAY : dateKey(new Date());
    setStart(shiftDate(today, -29));
    setEnd(today);
    setCategory("All");
    setProvider("All");
    setStatus("All");
    setPage(1);
  }
  async function download() {
    setLoading(true);
    try {
      const response = await fetch("/api/analytics?" + query + "&format=csv", {
        cache: "no-store",
      });
      if (!response.ok) {
        const result = await response.json();
        throw Error(result.error);
      }
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${mode}-${view}-${currency}-${start}-${end}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(
        "Exported all matching rows (or the selected top 20), with source, currency and unavailability labels.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setLoading(false);
    }
  }
  async function details(id: string) {
    setLoading(true);
    try {
      const response = await fetch(
        "/api/analytics?" + query + "&detail=" + encodeURIComponent(id),
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setSelected(result.order);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Order details unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }
  const orderRows = (data?.rows ?? []) as OrderRow[];
  const aggregates = (data?.rows ?? []) as AggregateRow[];
  return (
    <div className="analytics-workspace">
      <div className="finance-title">
        <div>
          <h2>{titles[view]}</h2>
          <p>
            {REPORTING_TIMEZONE} · Read-only panel operations · Server-side
            filtering and pagination
          </p>
        </div>
        <span className={`badge ${mode === "demo" ? "purple" : "pending"}`}>
          {mode === "demo" ? "DEMO DATA" : "LIVE CAPABILITIES UNVERIFIED"}
        </span>
      </div>
      <div className="finance-toolbar">
        <div className="period-tabs">
          <button
            className={mode === "live" ? "active" : ""}
            onClick={() => changeMode("live")}
          >
            Live analytics
          </button>
          <button
            className={mode === "demo" ? "active" : ""}
            onClick={() => changeMode("demo")}
          >
            DEMO DATA
          </button>
        </div>
        <select
          aria-label="Analytics currency"
          value={currency}
          onChange={(e) => {
            setCurrency(e.target.value as Currency);
            setPage(1);
          }}
        >
          {Object.keys(currencyDigits).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <div className="date-inputs">
          <input
            aria-label="Analytics start date"
            type="date"
            min={shiftDate(end, -365)}
            max={end}
            value={start}
            onChange={(e) => {
              if (
                e.target.value &&
                e.target.value <= end &&
                e.target.value >= shiftDate(end, -365)
              ) {
                setStart(e.target.value);
                setPage(1);
              }
            }}
          />
          <span>—</span>
          <input
            aria-label="Analytics end date"
            type="date"
            min={start}
            max={shiftDate(start, 365)}
            value={end}
            onChange={(e) => {
              if (
                e.target.value &&
                e.target.value >= start &&
                e.target.value <= shiftDate(start, 365)
              ) {
                setEnd(e.target.value);
                setPage(1);
              }
            }}
          />
        </div>
      </div>
      {!authenticated && (
        <Card>
          <CardHeader>
            <CardTitle>Administrator analytics access</CardTitle>
            <LockKeyhole size={17} />
          </CardHeader>
          <CardContent>
            <p className="muted">
              These analytics queries and exports require the same administrator
              session as Phase 3 expenses. Existing public demo dashboard and
              financial views remain available.
            </p>
            <form className="finance-login" onSubmit={login}>
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
              <Button type="submit" disabled={!configured || loading}>
                Sign in
              </Button>
            </form>
            <p className="fine-print muted">
              {!authChecked
                ? "Checking administrator configuration…"
                : !configured
                  ? "Configure DASHBOARD_ADMIN_PASSWORD and DASHBOARD_SESSION_SECRET server-side. Never use your panel API key as this password."
                  : "Authentication configured. Use your separate dashboard administrator password."}
            </p>
          </CardContent>
        </Card>
      )}
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {authenticated && (
        <>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Analytics controls</CardTitle>
                <p>
                  Dates select orders by creation date; recognized financial
                  postings must also fall in the selected range.
                </p>
              </div>
              <div className="integration-actions">
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={() => setReload(reload + 1)}
                >
                  <RefreshCw size={15} />
                  Refresh analytics
                </Button>
                <Button
                  variant="outline"
                  disabled={loading || !data}
                  onClick={download}
                >
                  <Download size={15} />
                  Export analytics CSV
                </Button>
              </div>
            </CardHeader>
            <div className="analytics-filters">
              <label className="search-field">
                <Search size={16} />
                <input
                  aria-label="Search analytics"
                  placeholder={
                    view === "orders"
                      ? "Order, customer, service or provider…"
                      : "ID, name or category…"
                  }
                  value={search}
                  maxLength={200}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <select
                aria-label="Analytics order status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="All">All order statuses</option>
                {orderStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                aria-label="Analytics category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="All">All categories</option>
                {data?.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                aria-label="Analytics provider"
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  setPage(1);
                }}
              >
                <option value="All">All providers</option>
                {data?.providerOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.id}
                  </option>
                ))}
              </select>
              {view === "services" && (
                <select
                  aria-label="Service status"
                  value={serviceStatus}
                  onChange={(e) => {
                    setServiceStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="All">All service statuses</option>
                  <option>Active</option>
                  <option>Disabled</option>
                  <option>Unavailable</option>
                </select>
              )}
              {view === "rankings" ? (
                <select
                  aria-label="Service ranking"
                  value={ranking}
                  onChange={(e) => {
                    setRanking(e.target.value);
                    setPage(1);
                  }}
                >
                  {Object.entries(rankingNames).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  aria-label="Analytics sort"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                >
                  {[
                    ["date-desc", "Newest first"],
                    ["date-asc", "Oldest first"],
                    ["name", "Name / ID"],
                    ["revenue", "Revenue · highest"],
                    ["profit", "Gross profit · highest"],
                    ["cost", "Provider costs · highest"],
                    ["margin", "Margin · highest"],
                  ].map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </Card>
          {loading && (
            <div className="analytics-loading" role="status" aria-live="polite">
              <RefreshCw size={17} />
              Loading authenticated analytics…
            </div>
          )}
          {data && (
            <>
              <p className="integration-message">
                {data.reason}
                {mode === "live" && data.manualMappings > 0
                  ? ` ${data.manualMappings} administrator-entered mappings are stored separately; they do not create verified panel statistics.`
                  : ""}
              </p>
              {view === "orders" && (
                <>
                  <div className="analytics-summary">
                    {[
                      "Total",
                      ...orderStatuses.filter(
                        (s) =>
                          s !== "Unknown" || (data.counts.Unknown ?? 0) > 0,
                      ),
                    ].map((s) => (
                      <button
                        key={s}
                        className={`card analytics-stat ${status === s || (s === "Total" && status === "All") ? "selected" : ""}`}
                        disabled={!data.available || loading}
                        aria-label={`Show ${s} orders`}
                        aria-pressed={
                          status === s || (s === "Total" && status === "All")
                        }
                        onClick={() => {
                          setStatus(s === "Total" ? "All" : s);
                          setPage(1);
                        }}
                      >
                        <span>{s} orders</span>
                        <strong>
                          {value(data.counts[s as keyof typeof data.counts])}
                        </strong>
                        <small>
                          {data.available
                            ? "Tap to filter"
                            : "API capability unavailable"}
                        </small>
                      </button>
                    ))}
                  </div>
                  <p className="fine-print muted">
                    Summary cards and chart show the
                    search/date/category/provider context before status
                    filtering. Pending and Processing are separate.
                  </p>
                  <Card>
                    <CardHeader>
                      <CardTitle>Order status distribution</CardTitle>
                    </CardHeader>
                    {data.available ? (
                      <div className="financial-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.chart}>
                            <CartesianGrid
                              stroke="var(--border)"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="name"
                              tick={{ fill: "var(--muted)", fontSize: 9 }}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fill: "var(--muted)", fontSize: 10 }}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                              }}
                            />
                            <Bar
                              dataKey="orders"
                              fill="#8b78ff"
                              isAnimationActive={false}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="empty">
                        Order chart unavailable: no verified order dataset.
                      </div>
                    )}
                  </Card>
                </>
              )}
              {view === "providers" && (
                <p className="fine-print muted">
                  Orders without an explicit provider association:{" "}
                  {value(data.unmappedOrders)}. They are not assigned to a
                  guessed provider. Connected services reflect the catalog
                  associations, not historic service changes.
                </p>
              )}
              {view === "rankings" && (
                <p className="fine-print muted">
                  Top 20 of all matching services, ranked before pagination.
                  Best-selling means ordered units including pending/canceled
                  demand, not completed revenue. Lowest margin and loss lists
                  exclude unknown costs. Most-canceled ranks by canceled count;
                  rate and sample size are shown separately.
                </p>
              )}
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>
                      {view === "orders"
                        ? "Orders"
                        : view === "services"
                          ? "Service rates and profitability"
                          : view === "providers"
                            ? "Provider comparison"
                            : rankingNames[
                                ranking as keyof typeof rankingNames
                              ]}
                    </CardTitle>
                    <p>
                      {data.available
                        ? `${data.total} matching ${view === "orders" ? "orders" : "rows"} · ${currency} · ${mode === "demo" ? "DEMO DATA" : "verified source"}`
                        : "Unavailable · no verified records"}
                    </p>
                  </div>
                  {view === "services" && (
                    <Button
                      variant="outline"
                      disabled
                      title="Live service editing is not implemented"
                    >
                      Editing disabled
                    </Button>
                  )}
                </CardHeader>
                <div className="table-scroll">
                  <table>
                    {view === "orders" ? (
                      <>
                        <thead>
                          <tr>
                            <th>Order / customer</th>
                            <th>Service</th>
                            <th>Provider</th>
                            <th>Created / status</th>
                            <th>Units</th>
                            <th>Selling price</th>
                            <th>Historical cost snapshot</th>
                            <th>Recognized revenue</th>
                            <th>Recognized cost</th>
                            <th>Gross profit</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderRows.map((o) => (
                            <tr key={o.id}>
                              <td>
                                <strong>{o.id}</strong>
                                <small className="cell-sub">
                                  {value(o.customer)}
                                </small>
                              </td>
                              <td>
                                {value(o.serviceName)}
                                <small className="cell-sub">
                                  {value(o.serviceId)}
                                </small>
                              </td>
                              <td>
                                {value(o.providerName)}
                                <small className="cell-sub">
                                  {value(o.providerId)} ·{" "}
                                  {value(o.providerSource)}
                                </small>
                              </td>
                              <td>
                                {dateKey(o.createdAt)}
                                <small
                                  className={`badge ${o.status.toLowerCase()}`}
                                >
                                  {o.status}
                                </small>
                              </td>
                              <td>{value(o.quantity)}</td>
                              <td>{displayMoney(o.sellingPrice, currency)}</td>
                              <td>
                                {displayMoney(o.historicalCost, currency)}
                                <small className="cell-sub">
                                  {o.costBasis === "snapshot-quote"
                                    ? "Historical quote, not recognized spending"
                                    : value(o.costBasis)}
                                </small>
                              </td>
                              <td>
                                {displayMoney(o.recognizedRevenue, currency)}
                              </td>
                              <td>{displayMoney(o.providerCosts, currency)}</td>
                              <td
                                className={
                                  o.grossProfit === null
                                    ? "muted"
                                    : minor(o.grossProfit, currency) < 0n
                                      ? "negative"
                                      : "positive"
                                }
                              >
                                {displayMoney(o.grossProfit, currency)}
                              </td>
                              <td>
                                <button
                                  className="icon-button"
                                  disabled={loading}
                                  aria-label={`Details for ${o.id}`}
                                  onClick={() => details(o.id)}
                                >
                                  <ArrowUpRight size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    ) : (
                      <>
                        <thead>
                          <tr>
                            <th>
                              {view === "providers" ? "Provider" : "Service"} /
                              ID
                            </th>
                            {view === "providers" ? (
                              <>
                                <th>Connected services</th>
                                <th>Completed</th>
                                <th>Completion rate</th>
                                <th>Pending / processing</th>
                              </>
                            ) : (
                              <>
                                <th>Category / catalog provider</th>
                                {view === "services" && (
                                  <>
                                    <th>Imported / status</th>
                                    <th>Selling rate</th>
                                    <th>Provider rate</th>
                                    <th>Rate margin</th>
                                  </>
                                )}
                              </>
                            )}
                            <th>Ordered units</th>
                            <th>Orders</th>
                            <th>Canceled / rate</th>
                            <th>Revenue</th>
                            <th>Recognized spending</th>
                            <th>Gross profit</th>
                            <th>Gross margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aggregates.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <strong>{r.name}</strong>
                                <small className="cell-sub">
                                  {r.id}
                                  {view === "providers"
                                    ? " · " + value(r.providerSource)
                                    : ""}
                                </small>
                              </td>
                              {view === "providers" ? (
                                <>
                                  <td>{r.connectedServices}</td>
                                  <td>{r.completed}</td>
                                  <td>{value(r.completionRate)}</td>
                                  <td>
                                    {r.pending} / {r.processing}
                                    <small className="cell-sub">
                                      Waiting rate: {value(r.pendingRate)}
                                    </small>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>
                                    {value(r.category)}
                                    <small className="cell-sub">
                                      {value(r.providerName)} ·{" "}
                                      {value(r.providerId)} ·{" "}
                                      {value(r.providerSource)}
                                    </small>
                                  </td>
                                  {view === "services" && (
                                    <>
                                      <td>
                                        {r.imported === null
                                          ? "Unavailable"
                                          : r.imported
                                            ? "Imported"
                                            : "Not imported"}
                                        <small className="cell-sub">
                                          Status: {value(r.status)}
                                        </small>
                                      </td>
                                      <td>
                                        {displayMoney(r.sellingRate, currency)}
                                        <small className="cell-sub">
                                          per {value(r.rateUnit)} units
                                        </small>
                                      </td>
                                      <td>
                                        {displayMoney(r.providerRate, currency)}
                                        <small className="cell-sub">
                                          Current catalog quote, not order cost
                                        </small>
                                      </td>
                                      <td>{value(r.rateMargin)}</td>
                                    </>
                                  )}
                                </>
                              )}
                              <td>{value(r.quantity)}</td>
                              <td>{r.orderCount}</td>
                              <td>
                                {r.canceled} / {value(r.cancellationRate)}
                              </td>
                              <td>{displayMoney(r.revenue, currency)}</td>
                              <td>{displayMoney(r.providerCosts, currency)}</td>
                              <td>{displayMoney(r.grossProfit, currency)}</td>
                              <td>{value(r.margin)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}
                  </table>
                  {!data.rows.length && (
                    <div className="empty">
                      {data.available
                        ? "No rows match these filters. Unknown financial amounts are not ranked."
                        : "Unavailable: the official API capabilities and fields are unverified."}
                    </div>
                  )}
                </div>
                <div className="pagination">
                  <span>
                    {data.total
                      ? `${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)}`
                      : "0"}{" "}
                    of {data.available ? data.total : "Unavailable"}
                  </span>
                  <div>
                    <select
                      aria-label="Analytics rows per page"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      {[10, 20, 50].map((n) => (
                        <option key={n} value={n}>
                          {n} / page
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      disabled={loading || data.page <= 1}
                      onClick={() => setPage(data.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={loading || data.page >= data.pages}
                      onClick={() => setPage(data.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </Card>
              {view === "providers" &&
                data.available &&
                aggregates.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Provider order comparison · current page
                      </CardTitle>
                    </CardHeader>
                    <div className="financial-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aggregates}>
                          <CartesianGrid
                            stroke="var(--border)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "var(--muted)", fontSize: 10 }}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fill: "var(--muted)", fontSize: 10 }}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "var(--card)",
                              border: "1px solid var(--border)",
                            }}
                          />
                          <Legend />
                          <Bar
                            dataKey="orderCount"
                            name="Orders"
                            fill="#7866ff"
                            isAnimationActive={false}
                          />
                          <Bar
                            dataKey="canceled"
                            name="Canceled"
                            fill="#f1ac62"
                            isAnimationActive={false}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Performance insights</CardTitle>
                    <p>
                      Minimum 20 orders for rate flags; low margin also requires
                      5 recognized sales. Negative-order flags require a known
                      loss.
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.insights.length ? (
                    data.insights.map((insight, i) => (
                      <div
                        className="analytics-insight"
                        key={insight.reference + insight.kind + i}
                      >
                        <span className="badge purple">{insight.kind}</span>
                        <p>
                          {mode === "demo" ? "DEMO DATA · " : ""}
                          {insight.message}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="muted">
                      {data.available
                        ? "No insight meets the configured thresholds in this filtered sample."
                        : "Insights unavailable without verified source data."}
                    </p>
                  )}
                  <p className="fine-print muted">
                    Pending orders alone do not prove a defective service or
                    provider. No paid tests or management actions are available.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
          {view === "providers" && mode === "live" && (
            <ManualProviderMappings />
          )}
        </>
      )}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Read-only order details</DialogTitle>
          <DialogDescription>
            {mode === "demo" ? "DEMO DATA · " : "Live source · "}No order
            actions or paid tests are implemented.
          </DialogDescription>
          {selected && (
            <>
              <div className="detail-heading">
                <h2>{selected.id}</h2>
                <span className="badge purple">{selected.status}</span>
              </div>
              {[
                ["Customer", selected.customer],
                ["Service", selected.serviceName],
                ["Service ID", selected.serviceId],
                ["Provider", selected.providerName],
                ["Provider ID", selected.providerId],
                ["Association source", selected.providerSource],
                ["Created", selected.createdAt],
                [
                  "Selling price",
                  displayMoney(selected.sellingPrice, currency),
                ],
                [
                  "Historical provider quote/cost",
                  displayMoney(selected.historicalCost, currency),
                ],
                ["Historical cost basis", selected.costBasis],
                [
                  "Recognized revenue",
                  displayMoney(selected.recognizedRevenue, currency),
                ],
                [
                  "Recognized provider costs",
                  displayMoney(selected.providerCosts, currency),
                ],
                ["Gross profit", displayMoney(selected.grossProfit, currency)],
              ].map(([label, v]) => (
                <div className="financial-row" key={label}>
                  <span>{label}</span>
                  <strong>{value(v)}</strong>
                </div>
              ))}
              <h3 className="history-heading">Status history</h3>
              {selected.statusHistory === null ? (
                <p className="fine-print muted">
                  Unavailable: source status-history fields have not been
                  verified. The current status is not a fabricated historical
                  timeline.
                </p>
              ) : (
                selected.statusHistory.map((event, i) => (
                  <div className="financial-row" key={event.at + i}>
                    <span>{event.at}</span>
                    <strong>{event.status}</strong>
                  </div>
                ))
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ManualProviderMappings() {
  const [rows, setRows] = useState<ProviderMapping[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [attest, setAttest] = useState(false);
  const [form, setForm] = useState({
    serviceId: "",
    providerId: "",
    providerName: "",
    validFrom: dateKey(new Date()),
    validTo: "",
    note: "",
  });
  const [history, setHistory] = useState<unknown[] | null>(null);
  async function load() {
    setBusy(true);
    try {
      const response = await fetch("/api/provider-mappings", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setRows(result.mappings);
      setLoaded(true);
      setMessage(
        "Manual associations loaded. They are not API-verified and do not create financial amounts.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Mappings unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/provider-mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Paksmart-Action": "finance",
        },
        body: JSON.stringify({
          ...form,
          validTo: form.validTo || null,
          attest,
          requestId,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setOpen(false);
      await load();
      setMessage(
        "Manual association recorded with an audit entry. Your live panel was not changed.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Mapping save failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function deactivate(row: ProviderMapping) {
    setBusy(true);
    try {
      const response = await fetch("/api/provider-mappings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Paksmart-Action": "finance",
        },
        body: JSON.stringify({ id: row.id, version: row.version }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Mapping update failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function audit(id: string) {
    setBusy(true);
    try {
      const response = await fetch(
        "/api/provider-mappings?history=" + encodeURIComponent(id),
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setHistory(result.history);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "History unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Manual provider associations</CardTitle>
          <p>
            Administrator-entered metadata in this app only; never guessed or
            API-verified.
          </p>
        </div>
        <div className="integration-actions">
          <Button variant="outline" disabled={busy} onClick={load}>
            <Link2 size={15} />
            Load mappings
          </Button>
          <Button
            disabled={busy || !loaded}
            onClick={() => {
              setRequestId(crypto.randomUUID());
              setAttest(false);
              setForm({
                serviceId: "",
                providerId: "",
                providerName: "",
                validFrom: dateKey(new Date()),
                validTo: "",
                note: "",
              });
              setOpen(true);
            }}
          >
            <Plus size={15} />
            Add mapping
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="integration-message">
          Use actual service/provider identifiers from your records and record
          their evidence. Mappings apply only to the stated dates when verified
          live orders become available; they never supply historical costs or
          rewrite verified provider associations.
        </p>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Service ID</th>
                <th>Provider name / ID</th>
                <th>Effective dates</th>
                <th>Evidence</th>
                <th>Status / version</th>
                <th>Local actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.serviceId}</td>
                  <td>
                    {row.providerName}
                    <small className="cell-sub">
                      {row.providerId} · manual
                    </small>
                  </td>
                  <td>
                    {row.validFrom} — {row.validTo ?? "Open-ended"}
                  </td>
                  <td className="mapping-note">{row.note}</td>
                  <td>
                    {row.active ? "Active" : "Inactive"} / {row.version}
                  </td>
                  <td>
                    <Button
                      variant="outline"
                      disabled={busy || !row.active}
                      onClick={() => deactivate(row)}
                    >
                      Deactivate mapping
                    </Button>
                    <button
                      className="icon-button"
                      disabled={busy}
                      aria-label={`Mapping history ${row.id}`}
                      onClick={() => audit(row.id)}
                    >
                      <History size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loaded && !rows.length && (
            <div className="empty">
              No manual mappings. No provider IDs are generated for you.
            </div>
          )}
        </div>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Add manual provider association</DialogTitle>
          <DialogDescription>
            Only local application metadata is saved. Enter actual identifiers;
            do not paste API keys.
          </DialogDescription>
          <form className="settings-form" onSubmit={save}>
            <label>
              Service ID
              <input
                required
                maxLength={100}
                pattern="[A-Za-z0-9._:\-]+"
                value={form.serviceId}
                onChange={(e) =>
                  setForm({ ...form, serviceId: e.target.value })
                }
              />
            </label>
            <label>
              Provider ID from your records
              <input
                required
                maxLength={100}
                pattern="[A-Za-z0-9._:\-]+"
                value={form.providerId}
                onChange={(e) =>
                  setForm({ ...form, providerId: e.target.value })
                }
              />
            </label>
            <label>
              Provider name
              <input
                required
                maxLength={100}
                value={form.providerName}
                onChange={(e) =>
                  setForm({ ...form, providerName: e.target.value })
                }
              />
            </label>
            <label>
              Valid from
              <input
                required
                type="date"
                value={form.validFrom}
                onChange={(e) =>
                  setForm({ ...form, validFrom: e.target.value })
                }
              />
            </label>
            <label>
              Valid to (optional)
              <input
                type="date"
                min={form.validFrom}
                value={form.validTo}
                onChange={(e) => setForm({ ...form, validTo: e.target.value })}
              />
            </label>
            <label>
              Evidence / source note
              <input
                required
                minLength={5}
                maxLength={500}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
            <label className="mapping-attestation">
              <input
                required
                type="checkbox"
                checked={attest}
                onChange={(e) => setAttest(e.target.checked)}
              />
              I verified these identifiers in my own records. This is a manual,
              not API-verified, association.
            </label>
            <Button type="submit" disabled={busy || !attest}>
              Save manual mapping
            </Button>
            {message && (
              <p className="fine-print muted" role="status">
                {message}
              </p>
            )}
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={history !== null}
        onOpenChange={(value) => {
          if (!value) setHistory(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Manual mapping audit history</DialogTitle>
          <DialogDescription>
            Before/after snapshots and administrator timestamps. No panel
            mutations.
          </DialogDescription>
          {history?.map((entry, i) => (
            <pre className="mapping-history" key={i}>
              {JSON.stringify(entry, null, 2)}
            </pre>
          ))}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
