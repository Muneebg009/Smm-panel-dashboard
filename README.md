# PakSmartPanel — Smart Business Manager

A separate, responsive Phase 1 admin dashboard built with Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui-style source components (Radix Dialog and Slot), Lucide and Recharts. Dark navy appearance is the default; use the sun button for light mode.

**DEMO DATA ONLY.** All customers, providers, orders, reliability figures, expenses, revenue and profit are fabricated. There are no live APIs, API keys, order creation, payments, provider tests or changes to paksmartpanel.com. This app has no authentication and must not be used with sensitive production information.

## Run and preview

Requires Node.js 20.9 or later (validated with Node 24) and npm.

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

`npm start` serves the production build on port 3000. No environment variables or external services are required. Production build uses local system fonts and needs no font CDN.

## Pages and interactions

- `/`: revenue and gross-profit KPIs, date ranges, revenue/profit chart, order breakdown, top five services, margin and provider spending, recent order details.
- `/profit-loss`: financial trend and income statement, including operating expenses.
- `/orders`: search by customer, service or ID; status filtering; pagination; accessible order details dialog.
- `/services`: searchable service catalog, platform filters, rate comparison and margins.
- `/providers`: simulated provider comparisons and spending chart; no live status or balances.
- `/top-services`: profitability ranking with search and platform filtering.
- `/reports`: downloadable demo order, service and financial CSV reports.
- `/expenses`: searchable ledger and validated local demo expense form.
- `/settings`: demo workspace preferences, appearance, notifications and explicit integration status.

The persistent DEMO DATA banner labels every page; exported CSVs are labeled too. Sidebar collapses to a mobile drawer. Tables scroll horizontally on small screens. Dialogs support keyboard navigation and Escape through Radix UI.

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

Order rates are historical snapshots so later catalog rate changes will not change past margins. Fixtures are all PKR; unit rates are per 1,000. Provider reliability is illustrative only. Added expenses, settings, appearance and notifications are temporary page state, reset on reload/navigation. Demo expenses do not persist between pages or change the base fixtures.

## Project structure

- `src/app`: App Router routes, metadata and responsive global styles.
- `src/components/dashboard-app.tsx`: dashboard shell, page views and demo interactions.
- `src/components/ui`: editable shadcn/ui-pattern Button, Card and Radix Dialog components.
- `src/lib/data.ts`: typed mock data and financial calculations.
- `tests/finance.test.ts`: meaningful financial recognition and date-boundary tests.

This deliverable stops at Phase 1. No real earnings are represented and no Phase 2 integrations are implemented.
