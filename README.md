# PakSmartPanel — Smart Business Manager

A separate, responsive Phase 1 admin dashboard built with Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui-style source components (Radix Dialog and Slot), Lucide and Recharts. Dark navy appearance is the default; use the sun button for light mode.

**DATA SOURCES:** All panel customers, providers, orders, reliability figures, revenue and profit shown in demo sections are fabricated Phase 1 fixtures. Live financials remain unavailable; authenticated manual business expenses are real administrator-entered records stored separately. No live API operations, order creation, payments, provider tests or changes to paksmartpanel.com are enabled. Optional Admin API credentials belong only in secure server environment settings. Public demo pages remain public; manual expense APIs require administrator authentication and a separate app database.

## Phase 4 order, service and provider analytics

The existing Orders, Services, Top Services and Providers pages now use authenticated, paginated server-side analytics with search/filter/sort, full-filter CSV, read-only details, six top-20 rankings, transparent sampled insights and manual provider associations with evidence and audit history. No live API fields were verified, so live analytics remain Unavailable. Existing Phase 1 fixtures remain separate DEMO DATA; missing status histories, imported flags and service statuses are not invented.

See [Phase 4 coverage, calculations and Android walkthrough](docs/phase-4-analytics.md). Demo analytics require the same separate administrator session as Phase 3; stored mappings reuse the app database. No Perfect Panel writes, paid tests or Phase 5 work are implemented.

## Phase 3 financial system

The existing app now includes an exact-money historical ledger, advanced live/unavailable vs DEMO DATA views, timezone-aware comparisons, separate currency reports, financial CSVs, and authenticated persistent manual expenses with edit history. No Perfect Panel financial endpoint is verified, so all live panel revenue/cost/profit remains Unavailable. Manual expenses need separate administrator credentials and durable PostgreSQL in production.

See [Phase 3 calculations, secure setup, and Android testing](docs/phase-3-financials.md). Existing Phase 2 API safeguards remain intact.

## Phase 2 integration status

The original demo UI is preserved. Settings and Dashboard now include a read-only integration capability report, configuration check, connection-test control, and manual Refresh Data control. Official documentation access is blocked by the cloud network policy, so the verified endpoint registry is empty and **no live calls are enabled**. Panel figures remain DEMO DATA or Unavailable. Authenticated manual expenses are separately labeled. The production Admin API base, response schemas, mapping and pagination remain unverified.

See [Perfect Panel integration report](docs/perfect-panel-integration.md) for supported/unavailable fields, security constraints, mocked test coverage, Android configuration steps, and how to test without changing the live panel. Do not enable a credential-backed live data route on this public app until administrator authentication and a panel-wide limiter are implemented.

## Run and preview

Requires Node.js 22.13 or later (validated with Node 24) and npm.

```bash
npm ci
npm run dev
```

Open the development server on port **3000** in your local browser or your development platform's port preview. The repository is `/workspace/Smm-panel-dashboard` in the cloud workspace. If the default npm cache is unwritable, use `npm ci --cache /workspace/.npm-cache`.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

`npm start` serves the production build on port 3000. Demo views need no environment variables or services; private expenses require the server configuration described in the Phase 3 guide. Production build uses local system fonts and needs no font CDN.

## Pages and interactions

- `/`: revenue and gross-profit KPIs, date ranges, revenue/profit chart, order breakdown, top five services, margin and provider spending, recent order details.
- `/profit-loss`: financial trend and income statement, including operating expenses.
- `/orders`: authenticated order analytics, status drill-down, server filters/pagination, recognized vs quoted financials, details and CSV.
- `/services`: authenticated service catalog, category/provider/status filters, quoted rates, margins and CSV; editing disabled.
- `/providers`: authenticated comparisons, completion/cancellation/waiting rates and auditable manual associations; no live balances or account changes.
- `/top-services`: six global top-20 rankings, explicit unknown financials and sampled performance insights.
- `/reports`: exact-decimal financial CSV, daily/weekly/monthly comparisons, expense breakdown, service/order/provider profitability and explicitly unavailable live data.
- `/expenses`: authenticated persistent manual expense ledger, edits, voids, history and CSV.
- `/settings`: demo workspace preferences, appearance, notifications and explicit integration status.

The persistent data-source banner distinguishes demo sections and authenticated manual expenses; financial views and CSVs label their source explicitly. Sidebar collapses to a mobile drawer. Tables scroll horizontally on small screens. Dialogs support keyboard navigation and Escape through Radix UI.

## Mock data and financial definitions

`src/lib/data.ts` defines `Provider`, `Service`, `Order`, `Expense`, and `DemoRepository`. It contains deterministic demo fixtures and pure financial selectors. Replace the repository boundary with an authenticated API adapter in a separately authorized future phase; no such adapter is included here.

Demo “today” is fixed to **21 October 2026** in Asia/Karachi to keep screenshots and calculations reproducible. The 240 sample orders cover 30 days. Today, 7 days, 30 days and inclusive custom filters affect period charts, tables and totals; dashboard today and monthly headline cards retain their stated periods.

- Completed revenue = quantity / 1,000 × snapshotted selling rate.
- Completed provider cost = quantity / 1,000 × snapshotted provider rate.
- Gross profit = recognized revenue − recognized provider cost.
- Gross margin = gross profit / recognized revenue × 100; zero when revenue is zero.
- Pending, processing and canceled orders recognize no revenue or costs.
- Net demo profit subtracts operating expenses in the selected period.
- Taxes, refunds, exchange rates and payment processing fees are outside Phase 1.

Order rates are historical snapshots so later catalog rate changes will not change past margins. Fixtures are all PKR; unit rates are per 1,000. Provider reliability is illustrative only. Settings, appearance and notifications are temporary page state. Manual expenses persist in the configured application database and never change demo fixtures.

## Project structure

- `src/app`: App Router routes, metadata and responsive global styles.
- `src/components/dashboard-app.tsx`: dashboard shell, page views and demo interactions.
- `src/components/ui`: editable shadcn/ui-pattern Button, Card and Radix Dialog components.
- `src/lib/data.ts`: typed mock data and financial calculations.
- `tests/finance.test.ts`: meaningful financial recognition and date-boundary tests.

The Phase 2 connection foundation is present but live integration is blocked pending documentation and access verification. No real earnings are represented. Phase 3 is implemented with live financials unavailable pending verified source data. Phase 4 analytics are implemented; live fields remain unavailable. Phase 5 is not implemented.
