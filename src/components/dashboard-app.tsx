"use client";

import Link from "next/link";
import { AnalyticsWorkspace } from "@/components/analytics-workspace";
import { FinancialWorkspace } from "@/components/financial-workspace";
import { PerfectPanelIntegration } from "@/components/perfect-panel-integration";
import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  ShoppingBag,
  Layers,
  Server,
  Trophy,
  FileChartColumn,
  Wallet,
  Settings,
  Zap,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Download,
  Moon,
  Sun,
  Menu,
  X,
  CalendarDays,
  ArrowRight,
  CircleHelp,
  Check,
  Bell,
  TrendingUp,
  DollarSign,
  CreditCard,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  demo,
  DEMO_TODAY,
  sections,
  slug,
  money,
  summarize,
  revenue,
  cost,
  profit,
  rangeOrders,
  type Order,
} from "@/lib/data";

const icons = [
  LayoutDashboard,
  ChartNoAxesCombined,
  ShoppingBag,
  Layers,
  Server,
  Trophy,
  FileChartColumn,
  Wallet,
  Settings,
];
const colors = ["#7866ff", "#37c9a0", "#4da7ff", "#f1ac62"];
const service = (id: string) => demo.services.find((s) => s.id === id)!;
const provider = (id: string) => demo.providers.find((p) => p.id === id)!;
function downloadCSV(name: string, rows: (string | number)[][]) {
  const csv =
    "DEMO DATA — simulated figures only\n" +
    rows
      .map((row) =>
        row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
      )
      .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `demo-${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone}`}>
      <i />
      {children}
    </span>
  );
}
function Platform({ name }: { name: string }) {
  return (
    <span className={`platform ${name.toLowerCase()}`}>
      {name === "YouTube"
        ? "▶"
        : name === "Instagram"
          ? "◎"
          : name === "TikTok"
            ? "♪"
            : "f"}
    </span>
  );
}
function Stat({
  label,
  value,
  change,
  icon: Icon = DollarSign,
  accent = false,
}: {
  label: string;
  value: string;
  change?: string;
  icon?: typeof DollarSign;
  accent?: boolean;
}) {
  return (
    <Card className={`stat ${accent ? "accent" : ""}`}>
      <div className="stat-label">
        {label}
        <span className="stat-icon">
          <Icon size={17} />
        </span>
      </div>
      <strong>{value}</strong>
      <div className="stat-foot">
        {change ? (
          <>
            <span className="positive">
              <TrendingUp size={12} />
              {change}
            </span>
            <span>vs. previous demo period</span>
          </>
        ) : (
          <span>Simulated • DEMO DATA</span>
        )}
        <svg viewBox="0 0 80 25" aria-hidden="true">
          <path
            d="M1 23L10 17L20 20L30 11L40 14L50 8L60 10L70 2L79 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>
    </Card>
  );
}
function Chart({ rows, bar = false }: { rows: Order[]; bar?: boolean }) {
  const points = Array.from(new Set(rows.map((o) => o.date)))
    .sort()
    .map((date) => {
      const total = summarize(rows.filter((o) => o.date === date));
      return {
        date: date.slice(5),
        Revenue: total.revenue,
        Profit: total.profit,
        Cost: total.cost,
      };
    });
  return (
    <div
      className="financial-chart"
      role="img"
      aria-label="Demo revenue and gross profit chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        {bar ? (
          <BarChart data={points}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(n) => `${n / 1000}k`}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
              }}
              formatter={(v) => money(Number(v))}
            />
            <Legend />
            <Bar
              isAnimationActive={false}
              dataKey="Revenue"
              fill="#7866ff"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              isAnimationActive={false}
              dataKey="Cost"
              fill="#4da7ff"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        ) : (
          <AreaChart
            data={points}
            margin={{ top: 15, right: 10, left: -12, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7866ff" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#7866ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              minTickGap={32}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(n) => `${n / 1000}k`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
              }}
              formatter={(v) => money(Number(v))}
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="Revenue"
              stroke="#8a79ff"
              strokeWidth={2.5}
              fill="url(#revenueFill)"
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="Profit"
              stroke="#37c9a0"
              strokeWidth={2.5}
              fill="transparent"
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
      {!points.length && (
        <span className="chart-empty">No demo orders in this range</span>
      )}
    </div>
  );
}
function OrderTable({
  rows,
  onSelect,
  compact = false,
}: {
  rows: Order[];
  onSelect: (o: Order) => void;
  compact?: boolean;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Service</th>
            <th>Customer</th>
            <th>Amount</th>
            {!compact && <th>Gross profit</th>}
            <th>Status</th>
            <th>Date</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id}>
              <td>
                <button className="text-button" onClick={() => onSelect(o)}>
                  #{o.id.replace("PS-", "")}
                </button>
              </td>
              <td>
                <div className="service-cell">
                  <Platform name={service(o.serviceId).platform} />
                  <div>
                    {service(o.serviceId).name}
                    <small>{o.quantity.toLocaleString()} units</small>
                  </div>
                </div>
              </td>
              <td>{o.customer}</td>
              <td>{money((o.quantity / 1000) * o.sellPer1000)}</td>
              {!compact && <td className="positive">{money(profit(o))}</td>}
              <td>
                <Badge tone={o.status.toLowerCase()}>{o.status}</Badge>
              </td>
              <td className="muted">{o.date.slice(5)}</td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`View order ${o.id}`}
                  onClick={() => onSelect(o)}
                >
                  <ArrowUpRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="empty">No demo orders match these filters.</div>
      )}
    </div>
  );
}

export function DashboardApp({ section }: { section: string }) {
  const [light, setLight] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [period, setPeriod] = useState("30 days");
  const [start, setStart] = useState("2026-09-22");
  const [end, setEnd] = useState(DEMO_TODAY);
  const [selected, setSelected] = useState<Order | null>(null);
  const [notice, setNotice] = useState("");
  const [business, setBusiness] = useState("PakSmartPanel");
  const [notify, setNotify] = useState(true);
  const rows = useMemo(() => rangeOrders(start, end), [start, end]);
  const totals = summarize(rows);
  const today = summarize(rangeOrders(DEMO_TODAY, DEMO_TODAY));
  const month = summarize(rangeOrders("2026-10-01", DEMO_TODAY));
  const filtered = rows;
  const serviceRows = demo.services.map((s) => {
    const orders = rows.filter((o) => o.serviceId === s.id);
    return { ...s, ...summarize(orders) };
  });
  const top = [...serviceRows].sort((a, b) => b.profit - a.profit);
  function changePeriod(value: string) {
    setPeriod(value);
    if (value === "Today") {
      setStart(DEMO_TODAY);
      setEnd(DEMO_TODAY);
    }
    if (value === "7 days") {
      setStart("2026-10-15");
      setEnd(DEMO_TODAY);
    }
    if (value === "30 days") {
      setStart("2026-09-22");
      setEnd(DEMO_TODAY);
    }
  }
  function exportOrders() {
    downloadCSV("orders", [
      [
        "Order",
        "Service",
        "Date",
        "Status",
        "Quantity",
        "Recognized revenue PKR",
        "Provider cost PKR",
        "Gross profit PKR",
      ],
      ...filtered.map((o) => [
        o.id,
        service(o.serviceId).name,
        o.date,
        o.status,
        o.quantity,
        revenue(o),
        cost(o),
        profit(o),
      ]),
    ]);
    setNotice("Demo CSV exported. All figures are simulated.");
  }
  const filters = (
    <div className="filters">
      <div className="period-tabs">
        {["Today", "7 days", "30 days", "Custom"].map((p) => (
          <button
            key={p}
            className={period === p ? "active" : ""}
            onClick={() => changePeriod(p)}
          >
            {p}
          </button>
        ))}
      </div>
      {period === "Custom" ? (
        <div className="date-inputs">
          <input
            aria-label="Start date"
            type="date"
            value={start}
            max={end}
            onChange={(e) => {
              setStart(e.target.value);
            }}
          />
          <span>—</span>
          <input
            aria-label="End date"
            type="date"
            value={end}
            min={start}
            onChange={(e) => {
              setEnd(e.target.value);
            }}
          />
        </div>
      ) : (
        <span className="date-display">
          <CalendarDays size={14} />
          {start} — {end}
        </span>
      )}
    </div>
  );
  const statusChart = ["Completed", "Processing", "Pending", "Canceled"].map(
    (name, i) => ({
      name,
      value: rows.filter((o) => o.status === name).length,
      color: colors[i],
    }),
  );
  return (
    <div className={`app ${light ? "light" : ""}`}>
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link className="brand" href="/">
          <span className="brand-icon">
            <Zap fill="currentColor" size={22} />
          </span>
          <div>
            PakSmart<span>Panel</span>
            <small>SMART BUSINESS MANAGER</small>
          </div>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <div className="workspace">
          <span className="workspace-avatar">PS</span>
          <div>
            PakSmartPanel<small>Demo workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {sections.map((name, i) => {
            const Icon = icons[i];
            return (
              <Link
                href={`/${slug(name)}`}
                key={name}
                className={section === name ? "active" : ""}
                onClick={() => setMobile(false)}
              >
                <Icon size={19} />
                {name}
                {name === "Orders" && <span className="nav-count">240</span>}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-box">
            <span className="demo-box-icon">
              <Zap size={17} />
            </span>
            <strong>Your business. Clearer.</strong>
            <p>Explore your panel’s potential with a safe demo workspace.</p>
            <span className="demo-tag">DEMO DATA</span>
          </div>
          <button
            className="help-link"
            onClick={() =>
              setNotice(
                "Live API access is blocked pending documentation verification. See Settings for the capability report.",
              )
            }
          >
            <CircleHelp size={17} />
            Help & documentation
            <ArrowUpRight size={15} />
          </button>
          <div className="profile">
            <span className="avatar">MA</span>
            <div>
              Muneeb Ahmed<small>Demo administrator</small>
            </div>
            <Badge tone="purple">Pro</Badge>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{section}</strong>
          </div>
          <div className="topbar-actions">
            <span className="environment">
              <i />
              Demo environment
            </span>
            <button
              className="icon-button"
              aria-label={
                light ? "Switch to dark mode" : "Switch to light mode"
              }
              onClick={() => setLight(!light)}
            >
              {light ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="notification icon-button"
              aria-label="View demo notifications"
              onClick={() =>
                setNotice(
                  "You’re all caught up. This workspace has no live alerts.",
                )
              }
            >
              <Bell size={18} />
              <i />
            </button>
            <span className="avatar small">MA</span>
          </div>
        </header>
        <main>
          <div className="demo-banner">
            <span className="demo-tag">DATA SOURCES</span>
            <span>
              Live panel financials are unavailable. DEMO DATA stays separate
              from authenticated manual expenses.
            </span>
            <span className="phase-tag">
              Phase 4 <span>•</span> Live panel financials unavailable
            </span>
          </div>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR BUSINESS AT A GLANCE</div>
              <h1>
                {section === "Dashboard" ? "Business overview" : section}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {section === "Dashboard"
                  ? "A clear picture of your performance. Every order, every margin."
                  : section === "Profit & Loss"
                    ? "Understand the numbers behind your simulated business."
                    : section === "Settings"
                      ? "Make this demo workspace your own."
                      : `Explore and manage your demo ${section.toLowerCase()}.`}
              </p>
            </div>
            {![
              "Profit & Loss",
              "Reports",
              "Expenses",
              "Orders",
              "Services",
              "Top Services",
              "Providers",
            ].includes(section) && (
              <Button variant="outline" onClick={exportOrders}>
                <Download size={16} />
                Export demo data
              </Button>
            )}
          </div>
          {["Dashboard", "Settings"].includes(section) && (
            <PerfectPanelIntegration />
          )}
          {![
            "Settings",
            "Profit & Loss",
            "Reports",
            "Expenses",
            "Orders",
            "Services",
            "Top Services",
            "Providers",
          ].includes(section) && filters}
          {notice && (
            <div className="notice" role="status">
              <Check size={16} />
              {notice}
              <button
                className="icon-button"
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {section === "Dashboard" && <FinancialWorkspace view="dashboard" />}
          {section === "Dashboard" && (
            <div className="finance-title">
              <h2>Original dashboard · DEMO DATA only</h2>
            </div>
          )}
          {section === "Dashboard" && (
            <>
              <div className="stats-grid">
                <Stat
                  label="Today’s revenue"
                  value={money(today.revenue)}
                  icon={Wallet}
                />
                <Stat
                  label="Today’s gross profit"
                  value={money(today.profit)}
                  icon={TrendingUp}
                />
                <Stat
                  label="Monthly revenue"
                  value={money(month.revenue)}
                  icon={CreditCard}
                />
                <Stat
                  label="Monthly gross profit"
                  value={money(month.profit)}
                  icon={ChartNoAxesCombined}
                  accent
                />
              </div>
              <div className="order-summary">
                {[
                  {
                    label: "Total orders",
                    value: totals.total,
                    color: "purple",
                  },
                  {
                    label: "Completed orders",
                    value: totals.completed,
                    color: "green",
                  },
                  {
                    label: "Pending / processing",
                    value: totals.pending,
                    color: "blue",
                  },
                  {
                    label: "Canceled orders",
                    value: totals.canceled,
                    color: "orange",
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <span className={`summary-icon ${s.color}`}>
                      <ShoppingBag size={17} />
                    </span>
                    <div>
                      <small>{s.label}</small>
                      <strong>{s.value.toLocaleString()}</strong>
                    </div>
                  </div>
                ))}
              </div>
              <div className="chart-grid">
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Revenue & gross profit</CardTitle>
                      <p>Simulated performance over the selected period</p>
                    </div>
                    <div className="chart-legend">
                      <span>
                        <i style={{ background: colors[0] }} />
                        Revenue
                      </span>
                      <span>
                        <i style={{ background: colors[1] }} />
                        Gross profit
                      </span>
                    </div>
                  </CardHeader>
                  <div className="chart-totals">
                    <strong>{money(totals.revenue)}</strong>
                    <span>selected period revenue</span>
                    <Badge tone="completed">DEMO</Badge>
                  </div>
                  <Chart rows={rows} />
                </Card>
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Order breakdown</CardTitle>
                      <p>Every order, accounted for</p>
                    </div>
                    <Activity size={18} className="muted" />
                  </CardHeader>
                  <div className="donut-wrap">
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie
                          isAnimationActive={false}
                          data={statusChart}
                          dataKey="value"
                          innerRadius={65}
                          outerRadius={83}
                          paddingAngle={4}
                          stroke="none"
                        >
                          {statusChart.map((s) => (
                            <Cell key={s.name} fill={s.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center">
                      <strong>{totals.total}</strong>
                      <span>Total orders</span>
                    </div>
                  </div>
                  <div className="status-legend">
                    {statusChart.map((s) => (
                      <div key={s.name}>
                        <span>
                          <i style={{ background: s.color }} />
                          {s.name}
                        </span>
                        <strong>
                          {s.value}
                          <small>
                            {totals.total
                              ? Math.round((s.value / totals.total) * 100)
                              : 0}
                            %
                          </small>
                        </strong>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <div className="lower-grid">
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Top profitable services</CardTitle>
                      <p>Your top 5 services by simulated gross profit</p>
                    </div>
                    <Link className="inline-link" href="/top-services">
                      View all
                      <ArrowRight size={14} />
                    </Link>
                  </CardHeader>
                  <div className="top-services">
                    {top.slice(0, 5).map((s, i) => (
                      <div key={s.id}>
                        <span className="rank">0{i + 1}</span>
                        <Platform name={s.platform} />
                        <div className="service-info">
                          <strong>{s.name}</strong>
                          <small>
                            {s.completed} completed orders <span>•</span>{" "}
                            {s.margin.toFixed(1)}% margin
                          </small>
                        </div>
                        <div className="service-profit">
                          {money(s.profit)}
                          <small>gross profit</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="health-card">
                  <CardHeader>
                    <div>
                      <CardTitle>Margin snapshot</CardTitle>
                      <p>Know what you keep</p>
                    </div>
                    <TrendingUp size={19} className="positive" />
                  </CardHeader>
                  <div className="margin-number">
                    {totals.margin.toFixed(1)}
                    <span>%</span>
                    <Badge tone="completed">Demo margin</Badge>
                  </div>
                  <div className="margin-track">
                    <span style={{ width: `${totals.margin}%` }} />
                  </div>
                  <div className="financial-row">
                    <span>Provider spending</span>
                    <strong>{money(totals.cost)}</strong>
                  </div>
                  <div className="financial-row">
                    <span>Gross profit</span>
                    <strong className="positive">{money(totals.profit)}</strong>
                  </div>
                  <div className="insight">
                    <span>✦</span>
                    <p>
                      Clear margins. Smarter decisions.
                      <small>
                        Gross profit = completed sales − provider costs.
                      </small>
                    </p>
                  </div>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Recent orders</CardTitle>
                    <p>The latest activity in your demo workspace</p>
                  </div>
                  <Link className="inline-link" href="/orders">
                    All orders
                    <ArrowRight size={14} />
                  </Link>
                </CardHeader>
                <OrderTable
                  rows={rows.slice(0, 5)}
                  onSelect={setSelected}
                  compact
                />
              </Card>
            </>
          )}
          {section === "Orders" && <AnalyticsWorkspace view="orders" />}
          {section === "Services" && <AnalyticsWorkspace view="services" />}
          {section === "Top Services" && <AnalyticsWorkspace view="rankings" />}
          {section === "Profit & Loss" && (
            <FinancialWorkspace view="dashboard" />
          )}
          {section === "Providers" && <AnalyticsWorkspace view="providers" />}
          {section === "Reports" && <FinancialWorkspace view="reports" />}
          {section === "Expenses" && <FinancialWorkspace view="expenses" />}
          {section === "Settings" && (
            <div className="settings-grid">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Workspace preferences</CardTitle>
                    <p>Changes apply to this demo session only</p>
                  </div>
                </CardHeader>
                <form
                  className="settings-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setNotice(
                      "Demo preferences saved for this session. No live account was changed.",
                    );
                  }}
                >
                  <label>
                    Business name
                    <input
                      required
                      maxLength={70}
                      value={business}
                      onChange={(e) => setBusiness(e.target.value)}
                    />
                  </label>
                  <label>
                    Reporting currency
                    <select defaultValue="PKR">
                      <option>PKR</option>
                    </select>
                    <small>
                      Demo service rates are denominated in Pakistani rupees.
                    </small>
                  </label>
                  <label>
                    Reporting timezone
                    <input readOnly value="Asia/Karachi (UTC+05:00)" />
                  </label>
                  <div className="setting-toggle">
                    <div>
                      <strong>Light appearance</strong>
                      <p>Switch the dashboard color theme</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={light}
                      aria-label="Light appearance"
                      className={`switch ${light ? "on" : ""}`}
                      onClick={() => setLight(!light)}
                    >
                      <span />
                    </button>
                  </div>
                  <div className="setting-toggle">
                    <div>
                      <strong>Demo notifications</strong>
                      <p>Example preference; no messages are sent</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notify}
                      aria-label="Demo notifications"
                      className={`switch ${notify ? "on" : ""}`}
                      onClick={() => setNotify(!notify)}
                    >
                      <span />
                    </button>
                  </div>
                  <Button type="submit">Save demo preferences</Button>
                </form>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Live data boundaries</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="muted">
                    Orders, services, customers and payments are unavailable
                    until official endpoint schemas and access controls are
                    verified. No live and demo figures are combined.
                  </p>
                  <div className="safety-list">
                    <span>
                      <Check size={15} />
                      No credentials in the browser
                    </span>
                    <span>
                      <Check size={15} />
                      No panel mutations
                    </span>
                    <span>
                      <Check size={15} />
                      No automatic background sync
                    </span>
                    <span>
                      <Check size={15} />
                      Existing website is untouched
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <footer>
            <span>
              © 2026 PakSmartPanel <span className="footer-dot">•</span> Smart
              Business Manager
            </span>
            <span>
              <i />
              DEMO DATA · Simulated figures only
            </span>
          </footer>
        </main>
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Demo order details</DialogTitle>
          <DialogDescription>
            Simulated order. No live request or provider action is available.
          </DialogDescription>
          {selected && (
            <>
              <div className="detail-heading">
                <h2>{selected.id}</h2>
                <Badge tone={selected.status.toLowerCase()}>
                  {selected.status}
                </Badge>
              </div>
              {[
                ["Service", service(selected.serviceId).name],
                ["Customer", selected.customer],
                [
                  "Provider",
                  provider(service(selected.serviceId).providerId).name,
                ],
                ["Quantity", selected.quantity.toLocaleString()],
                ["Date", selected.date],
                [
                  "Selling amount",
                  money((selected.quantity / 1000) * selected.sellPer1000),
                ],
                ["Recognized revenue", money(revenue(selected))],
                ["Recognized provider cost", money(cost(selected))],
                ["Recognized gross profit", money(profit(selected))],
              ].map(([k, v]) => (
                <div className="financial-row" key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
              <p className="fine-print muted">
                DEMO DATA. Revenue and cost are recognized only for completed
                orders.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
