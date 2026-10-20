"use client";

import Link from "next/link";
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
  Search,
  Moon,
  Sun,
  Menu,
  X,
  CalendarDays,
  ArrowRight,
  CircleHelp,
  Check,
  Plus,
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
  type Expense,
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [platform, setPlatform] = useState("All platforms");
  const [selected, setSelected] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>(demo.expenses);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Software");
  const [business, setBusiness] = useState("PakSmartPanel");
  const [notify, setNotify] = useState(true);
  const rows = useMemo(() => rangeOrders(start, end), [start, end]);
  const totals = summarize(rows);
  const today = summarize(rangeOrders(DEMO_TODAY, DEMO_TODAY));
  const month = summarize(rangeOrders("2026-10-01", DEMO_TODAY));
  const filtered = rows.filter(
    (o) =>
      (status === "All statuses" || o.status === status) &&
      `${o.id} ${o.customer} ${service(o.serviceId).name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const serviceRows = demo.services
    .map((s) => {
      const orders = rows.filter((o) => o.serviceId === s.id);
      return { ...s, ...summarize(orders) };
    })
    .filter(
      (s) =>
        (platform === "All platforms" || s.platform === platform) &&
        s.name.toLowerCase().includes(query.toLowerCase()),
    );
  const top = [...serviceRows].sort((a, b) => b.profit - a.profit);
  const expenseTotal = expenses
    .filter((e) => e.date >= start && e.date <= end)
    .reduce((s, e) => s + e.amount, 0);
  function changePeriod(value: string) {
    setPeriod(value);
    setPage(1);
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
              setPage(1);
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
              setPage(1);
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
  const search = (placeholder: string) => (
    <label className="search-field">
      <Search size={16} />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
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
                "Phase 1 is an offline demo. See README for setup and data definitions.",
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
            <span className="demo-tag">DEMO DATA</span>
            <span>
              You’re exploring a demo workspace. All orders, revenue, and
              profits are simulated.
            </span>
            <span className="phase-tag">
              Phase 1 <span>•</span> No live connections
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
            <Button variant="outline" onClick={exportOrders}>
              <Download size={16} />
              Export demo data
            </Button>
          </div>
          {section !== "Settings" && filters}
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
          {section === "Orders" && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>
                    All demo orders{" "}
                    <span className="count">{filtered.length}</span>
                  </CardTitle>
                  <p>Inspect order details without sending any requests</p>
                </div>
              </CardHeader>
              <div className="table-toolbar">
                {search("Search order, customer or service…")}
                <select
                  aria-label="Order status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  {[
                    "All statuses",
                    "Completed",
                    "Processing",
                    "Pending",
                    "Canceled",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <OrderTable
                rows={filtered.slice((page - 1) * 10, page * 10)}
                onSelect={setSelected}
              />
              <div className="pagination">
                <span>
                  {filtered.length
                    ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, filtered.length)}`
                    : "0"}{" "}
                  of {filtered.length} demo orders
                </span>
                <div>
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={page * 10 >= filtered.length}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          )}
          {(section === "Services" || section === "Top Services") && (
            <>
              <div className="stats-grid three">
                <Stat
                  label="Demo services"
                  value={String(demo.services.length)}
                  icon={Layers}
                />
                <Stat
                  label="Gross profit · selected period"
                  value={money(totals.profit)}
                  icon={TrendingUp}
                />
                <Stat
                  label="Weighted profit margin"
                  value={`${totals.margin.toFixed(1)}%`}
                  icon={ChartNoAxesCombined}
                />
              </div>
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>
                      {section === "Top Services"
                        ? "Service profitability ranking"
                        : "Service catalog"}
                    </CardTitle>
                    <p>
                      Rates in PKR per 1,000 units • imported service examples
                      only
                    </p>
                  </div>
                </CardHeader>
                <div className="table-toolbar">
                  {search("Search demo services…")}
                  <select
                    aria-label="Filter platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                  >
                    {[
                      "All platforms",
                      "Instagram",
                      "YouTube",
                      "TikTok",
                      "Facebook",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Provider</th>
                        <th>Sell / 1k</th>
                        <th>Cost / 1k</th>
                        <th>Unit margin</th>
                        <th>Orders</th>
                        <th>Gross profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(section === "Top Services" ? top : serviceRows).map(
                        (s) => (
                          <tr key={s.id}>
                            <td>
                              <div className="service-cell">
                                <Platform name={s.platform} />
                                <div>
                                  {s.name}
                                  <small>DEMO • {s.id.toUpperCase()}</small>
                                </div>
                              </div>
                            </td>
                            <td>{provider(s.providerId).name}</td>
                            <td>{money(s.sellPer1000)}</td>
                            <td>{money(s.costPer1000)}</td>
                            <td>
                              <Badge tone="completed">
                                {(
                                  ((s.sellPer1000 - s.costPer1000) /
                                    s.sellPer1000) *
                                  100
                                ).toFixed(1)}
                                %
                              </Badge>
                            </td>
                            <td>{s.total}</td>
                            <td className="positive">{money(s.profit)}</td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                  {!serviceRows.length && (
                    <div className="empty">
                      No demo services match your search.
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
          {section === "Profit & Loss" && (
            <>
              <div className="stats-grid">
                <Stat
                  label="Recognized revenue"
                  value={money(totals.revenue)}
                />
                <Stat
                  label="Provider costs"
                  value={money(totals.cost)}
                  icon={Server}
                />
                <Stat
                  label="Gross profit"
                  value={money(totals.profit)}
                  icon={TrendingUp}
                />
                <Stat
                  label="Net demo profit"
                  value={money(totals.profit - expenseTotal)}
                  accent
                  icon={Wallet}
                />
              </div>
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Revenue vs. provider costs</CardTitle>
                    <p>Completed orders only • DEMO DATA</p>
                  </div>
                </CardHeader>
                <Chart rows={rows} bar />
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Demo income statement</CardTitle>
                </CardHeader>
                <CardContent>
                  {[
                    ["Customer sales", totals.revenue],
                    ["Less: provider costs", -totals.cost],
                    ["Gross profit", totals.profit],
                    ["Less: operating expenses", -expenseTotal],
                    ["Net simulated profit", totals.profit - expenseTotal],
                  ].map(([label, value]) => (
                    <div className="statement-row" key={label}>
                      <span>{label}</span>
                      <strong>{money(Number(value))}</strong>
                    </div>
                  ))}
                  <p className="muted fine-print">
                    Accrual-style demo: revenue and provider cost recognized on
                    completion. Taxes, refunds, exchange rates, and payment fees
                    are outside Phase 1.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
          {section === "Providers" && (
            <>
              <div className="provider-grid">
                {demo.providers
                  .filter((p) =>
                    p.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((p, i) => {
                    const ids = demo.services
                      .filter((s) => s.providerId === p.id)
                      .map((s) => s.id);
                    const total = summarize(
                      rows.filter((o) => ids.includes(o.serviceId)),
                    );
                    return (
                      <Card key={p.id} className="provider-card">
                        <div className="provider-title">
                          <span className={`provider-avatar provider-${i}`}>
                            {p.name.slice(0, 2)}
                          </span>
                          <Badge tone="purple">Demo provider</Badge>
                        </div>
                        <h2>{p.name}</h2>
                        <p>
                          {p.region} • {ids.length} demo services
                        </p>
                        <div className="financial-row">
                          <span>Provider spending</span>
                          <strong>{money(total.cost)}</strong>
                        </div>
                        <div className="financial-row">
                          <span>Gross profit</span>
                          <strong className="positive">
                            {money(total.profit)}
                          </strong>
                        </div>
                        <div className="financial-row">
                          <span>Sample reliability</span>
                          <strong>{p.reliability}%</strong>
                        </div>
                        <div className="margin-track">
                          <span
                            style={{
                              width: `${p.reliability}%`,
                              background: colors[i],
                            }}
                          />
                        </div>
                        <small className="muted">
                          Not connected • No balance or live status available
                        </small>
                      </Card>
                    );
                  })}
              </div>
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Provider comparison</CardTitle>
                    <p>Simulated costs and profit contribution</p>
                  </div>
                  {search("Search providers…")}
                </CardHeader>
                <div className="comparison-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={demo.providers.map((p) => ({
                        name: p.name,
                        ...summarize(
                          rows.filter(
                            (o) => service(o.serviceId).providerId === p.id,
                          ),
                        ),
                      }))}
                    >
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "var(--muted)", fontSize: 11 }}
                      />
                      <YAxis
                        tickFormatter={(n) => `${n / 1000}k`}
                        tick={{ fill: "var(--muted)", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                        }}
                        formatter={(v) => money(Number(v))}
                      />
                      <Legend />
                      <Bar
                        isAnimationActive={false}
                        name="Provider spending"
                        dataKey="cost"
                        fill="#7866ff"
                        radius={[5, 5, 0, 0]}
                      />
                      <Bar
                        isAnimationActive={false}
                        name="Gross profit"
                        dataKey="profit"
                        fill="#37c9a0"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}
          {section === "Reports" && (
            <>
              <div className="report-intro">
                <span className="report-icon">
                  <FileChartColumn size={30} />
                </span>
                <div>
                  <h2>Your numbers, ready to share.</h2>
                  <p>
                    Export clearly labeled demo reports for the selected date
                    range.
                  </p>
                </div>
              </div>
              <div className="report-grid">
                {[
                  {
                    title: "Order activity",
                    description:
                      "Detailed orders, statuses, revenue and provider costs.",
                    action: exportOrders,
                  },
                  {
                    title: "Service profitability",
                    description:
                      "Compare unit prices, margins and gross profit by service.",
                    action: () =>
                      downloadCSV("services", [
                        [
                          "Service",
                          "Orders",
                          "Revenue PKR",
                          "Cost PKR",
                          "Gross profit PKR",
                          "Margin %",
                        ],
                        ...top.map((s) => [
                          s.name,
                          s.total,
                          s.revenue,
                          s.cost,
                          s.profit,
                          s.margin.toFixed(2),
                        ]),
                      ]),
                  },
                  {
                    title: "Financial summary",
                    description:
                      "Recognized sales, provider spending and operating expenses.",
                    action: () =>
                      downloadCSV("financial-summary", [
                        [
                          "Start",
                          "End",
                          "Revenue PKR",
                          "Provider costs PKR",
                          "Expenses PKR",
                          "Net demo profit PKR",
                        ],
                        [
                          start,
                          end,
                          totals.revenue,
                          totals.cost,
                          expenseTotal,
                          totals.profit - expenseTotal,
                        ],
                      ]),
                  },
                ].map((r) => (
                  <Card key={r.title} className="report-card">
                    <FileChartColumn className="purple-text" />
                    <h2>{r.title}</h2>
                    <p>{r.description}</p>
                    <Badge tone="purple">DEMO DATA · CSV</Badge>
                    <Button
                      variant="outline"
                      onClick={() => {
                        r.action();
                        setNotice("Demo report exported successfully.");
                      }}
                    >
                      <Download size={15} />
                      Download report
                    </Button>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Financial trend</CardTitle>
                    <p>Preview of the selected demo reporting period</p>
                  </div>
                </CardHeader>
                <Chart rows={rows} />
              </Card>
            </>
          )}
          {section === "Expenses" && (
            <>
              <div className="stats-grid three">
                <Stat
                  label="Operating expenses · selected period"
                  value={money(expenseTotal)}
                  icon={Wallet}
                />
                <Stat
                  label="Demo entries · all dates"
                  value={String(expenses.length)}
                  icon={FileChartColumn}
                />
                <Stat
                  label="Net demo profit · selected period"
                  value={money(totals.profit - expenseTotal)}
                  icon={TrendingUp}
                />
              </div>
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Expense ledger</CardTitle>
                    <p>Local demo entries reset when you reload this page</p>
                  </div>
                  <Button onClick={() => setExpenseOpen(true)}>
                    <Plus size={16} />
                    Add demo expense
                  </Button>
                </CardHeader>
                <div className="table-toolbar">
                  {search("Search expenses…")}
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Expense</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses
                        .filter(
                          (e) =>
                            e.date >= start &&
                            e.date <= end &&
                            `${e.name} ${e.category}`
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                        )
                        .map((e) => (
                          <tr key={e.id}>
                            <td>{e.name}</td>
                            <td>{e.category}</td>
                            <td>{e.date}</td>
                            <td>{money(e.amount)}</td>
                            <td>
                              <Badge tone="purple">DEMO DATA</Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {!expenses.some(
                    (e) =>
                      e.date >= start &&
                      e.date <= end &&
                      `${e.name} ${e.category}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  ) && (
                    <div className="empty">
                      No demo expenses match these filters.
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
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
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Integration status</CardTitle>
                    <Badge tone="pending">Not connected</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="integration-symbol">
                      <Layers size={27} />
                    </div>
                    <h3>Perfect Panel</h3>
                    <p className="muted">
                      Phase 1 uses an isolated mock data layer. No provider or
                      Perfect Panel APIs are connected.
                    </p>
                    <div className="safety-list">
                      <span>
                        <Check size={15} />
                        No API keys required
                      </span>
                      <span>
                        <Check size={15} />
                        No orders can be created
                      </span>
                      <span>
                        <Check size={15} />
                        No payments or service testing
                      </span>
                      <span>
                        <Check size={15} />
                        Existing website is untouched
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <p className="settings-note">
                  This is a separate admin application. Authentication and
                  production integrations are outside Phase 1.
                </p>
              </div>
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
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent>
          <DialogTitle>Add demo expense</DialogTitle>
          <DialogDescription>
            Creates a temporary local demo entry. No money is spent.
          </DialogDescription>
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !expenseName.trim() ||
                !Number.isFinite(Number(expenseAmount)) ||
                Number(expenseAmount) <= 0
              )
                return;
              setExpenses([
                ...expenses,
                {
                  id: `local-${Date.now()}`,
                  name: expenseName.trim(),
                  category: expenseCategory,
                  amount: Number(expenseAmount),
                  date: DEMO_TODAY,
                },
              ]);
              setExpenseOpen(false);
              setExpenseName("");
              setExpenseAmount("");
              setNotice("Demo expense added locally. It will reset on reload.");
            }}
          >
            <label>
              Description
              <input
                required
                maxLength={80}
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
              />
            </label>
            <label>
              Amount (PKR)
              <input
                required
                type="number"
                min="0.01"
                max="10000000"
                step="0.01"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </label>
            <label>
              Category
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
              >
                {["Software", "Infrastructure", "Marketing", "Other"].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </label>
            <Button type="submit">
              <Plus size={16} />
              Add demo expense
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
