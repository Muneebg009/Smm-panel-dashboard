# Phase 3: advanced finance and private expenses

## What is actual, demo, and unavailable

**No verified real Perfect Panel financial fields are available.** Phase 2's official endpoint registry is still empty. This phase makes no Perfect Panel request and does not change the live account. There is no automatic sync, order modification, service testing, new API endpoint guess, or Phase 4 work.

- **Live financials (default):** all panel revenue, historical provider costs, order/service/provider profit, margin, net profit, cash flow and financial sync timestamps are Unavailable / Never. Empty coverage does not mean zero earnings. Adding an API key does not change this.
- **DEMO DATA:** the financial engine can display only existing Phase 1 fixtures in a separate mode. It generates no new sample revenue, refunds, orders or profits. Demo expenses also come only from the original fixtures. Administrator-entered expenses never enter demo totals.
- **Manual business expenses:** real entries supplied by the authenticated administrator and saved to this app's own database, with dates, exact currency amounts, categories, allocation periods, versions and history. They are not independently verified by the panel. The engine can allocate these costs in live mode after the user explicitly loads the ledger; revenue/profit remain unknown because the panel data is unavailable.
- **Net profit:** Unavailable even in the demo when tax or non-operating coverage is unknown. Gross profit and operating profit are distinct; cash flow is a separate ledger. No missing tax or cost is assumed to be zero.

## Financial contract and calculations

`src/lib/finance/types.ts` defines an **internal accounting contract**, not purported Perfect Panel fields. No live adapter is implemented until official methods, response fields and historical financial coverage are verified.

All input amounts are decimal strings. `money.ts` converts them into BigInt minor units for calculations, without binary floating point. Currencies supported explicitly: PKR, USD, EUR, GBP, AED, SAR (2 decimals), JPY (0), KWD (3). Excess decimal places and unsupported currencies are rejected. Each report selects a single currency; there is no exchange-rate assumption. Recharts receives floating point numbers only to plot already-calculated amounts; tables and CSV retain exact decimal strings. Rankings use exact minor units.

- Recognized revenue is explicitly posted for completed or verified partial deliveries, using historical order amounts. Pending orders cannot recognize positive sales. Partial recognition requires delivery evidence and explicit attributable amounts, not a guess based on status. The engine supports positive historical recognition followed by cancellation/refund postings; it never deletes history when an order changes status.
- Attributable provider costs must exist for the same order/currency/delivery allocation as recognized revenue. Missing or null cost makes provider costs and gross/operating/net profit unavailable. Current catalog rates are never consulted by the advanced engine.
- Customer refunds reduce recognized revenue; provider refunds reduce provider costs. Their posting dates determine the reporting period, even if the original order is older.
- When a source historical net posting already includes a same-date refund, an explicit bidirectional `includedIn` / `includedAdjustmentIds` link prevents double subtraction. Missing references, wrong currencies, wrong orders or cross-date embedded adjustments are rejected. Later refunds require separate dated postings, not a retrospective overwrite of the original sale.
- Stable event IDs and transaction/kind keys deduplicate sync replays. Conflicting replays fail rather than replacing historical values. API transaction line identifiers must be mapped to stable unique transaction keys before any future ingestion.
- Gross profit = recognized revenue net of unapplied customer refunds − attributable cost net of unapplied provider refunds.
- Operating profit = gross profit − allocated operating expenses.
- Net profit = operating profit + verified non-operating income − verified non-operating expenses − verified taxes. If any required coverage is unknown, the corresponding result is unavailable.
- Wallet deposits are excluded from revenue. Cash inflows/outflows (including deposits) are separate explicit postings, not inferred from profit or expenses. Expense dates are not assumed to be cash-payment dates.

All posting timestamps require an explicit UTC offset or Z. Reporting timezone is consistently **Asia/Karachi**. Expense service dates are date-only values in that reporting calendar. A daily allocation divides the total minor units evenly over an inclusive date range; remainder units go to the earliest days so all periods reconcile exactly. Voiding an expense excludes it from allocations while retaining its history. Expense date and allocation period are recorded separately.

The dashboard supports today, yesterday, rolling last 7 days, month-to-date and previous calendar month. Comparison tables show a local day vs yesterday, rolling 7 days vs preceding 7 days, or month-to-date vs the full previous calendar month. No misleading percentage growth is calculated for unequal month coverage. Financial chart ranges are bounded to 366 days, and expense allocations to 3,660 days. Explicit date inputs select custom ranges.

## Private expense configuration

Use a **separate application-owned PostgreSQL database**, never Perfect Panel's database. The app creates only `business_expenses` and `business_expense_history` in that configured database. Dedicated credentials should have access only to that application database/schema. All SQL values are parameterized and PostgreSQL connections require certificate verification.

Server-only environment variables:

| Name                       | Required for             | Notes                                                                                                |
| -------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `DASHBOARD_ADMIN_PASSWORD` | Expense sign-in          | At least 16 characters; use a strong unique random password. Not a Perfect Panel API key.            |
| `DASHBOARD_SESSION_SECRET` | Signed sessions          | At least 32 characters; generate a strong random secret. Rotate to invalidate sessions.              |
| `DATABASE_URL`             | Deployed expense storage | PostgreSQL connection string for this app's dedicated database. Never commit or log it.              |
| `EXPENSES_SQLITE_PATH`     | Local development only   | Optional path to an app-owned local SQLite file; parent directory must exist. Ignored in production. |

These credentials must be real server-process values, not destination-proxy placeholders. Do not declare a local password or database URL as an HTTP proxy-injected Perfect Panel secret. Use secure runtime settings / sensitive environment variables. No `NEXT_PUBLIC_` prefix. No credentials are included in this repository.

For Vercel on Android: open the project → **Settings → Environment Variables**. Add the three required server variables using the secure/sensitive value controls for the intended deployment environment, then redeploy. Vercel's local `/tmp` filesystem is not durable; **SQLite is deliberately disabled in production**. Without the three variables, the public demo works but expense login/storage stays locked. PostgreSQL setup/connectivity is not yet validated against a real deployment because no database credentials were supplied.

For local development, use Node **22.13+** (validated on Node 24):

```bash
npm ci
mkdir -p .local
# Supply the administrator credentials through your shell's secure environment tooling.
# Set EXPENSES_SQLITE_PATH to an absolute path such as /workspace/Smm-panel-dashboard/.local/expenses.db.
npm run dev
```

SQLite and tests use the built-in `node:sqlite` module; it may emit an experimental warning on supported Node versions. The database files and `.local` directory are ignored by Git. SQLite is used only for local development/persistence tests. Production uses PostgreSQL.

## Access controls and history

Only `/api/admin-session` handles the administrator password. It is never saved to browser storage. Sessions use HMAC signatures, server secret validation, an 8-hour lifetime, HttpOnly/SameSite=Strict cookies, and Secure cookies on HTTPS. All expense reads and writes require authentication; writes also require a same-origin custom-header request. Responses are private/no-store. Bodies are bounded and errors do not disclose database credentials. Password checks use scrypt-derived constant-time comparison.

A process-local global login throttle allows at most five attempts in ten minutes. **Configure an upstream/WAF login rate limit for multi-instance deployments**, because in-memory throttles are not shared across serverless instances. Administrator sign-in protects expense APIs; it does not make existing public demo pages private and is not a replacement for protecting future real panel data.

Expense edits use optimistic version checks (409 for stale edits). Create retries reuse a client-generated idempotency key. Database transactions atomically save the record and an append-only before/after audit snapshot, with server timestamps and the administrator actor. No delete API is implemented; voiding retains history. Audit immutability is enforced by the application API, not against a privileged database administrator. Database backups and recovery remain deployment responsibilities.

## Android walkthrough

1. Open the dashboard's deployed URL after this code has been published/deployed. This task does not itself publish to GitHub or Vercel.
2. Tap the **☰ menu → Profit & Loss**. The advanced financial cards start in **Live financials**, showing Unavailable and financial last sync Never.
3. Tap **DEMO DATA** to inspect the original fixture calculations. Change currency or start/end dates. Demo “today” remains 21 October 2026; live dates use the actual reporting calendar. Demo and live modes never share expense totals.
4. Open **Reports**, choose Daily / Weekly / Monthly, inspect income statement and expense breakdown, and tap **Export financial CSV**. Exports include data-source and currency labels, unavailable cells and reporting timezone. Potential spreadsheet formula strings are neutralized.
5. Open **Expenses**. Without server configuration it must stay locked. After configuration, enter the separate administrator password and tap **Sign in → Load saved expenses → Add business expense**.
6. Enter description, exact decimal amount, currency, expense date, category and allocation dates; tap **Save expense**. Use the pencil to edit, the history icon to inspect before/after versions, and Void to reverse an entry without erasing its history.
7. On a live financial report, sign in (or reuse the existing session) and tap **Load saved expenses** to include manual operating costs. Panel revenue/cost/profit still remain unavailable until a verified read-only adapter exists.

Manual expense writes affect only this app's own ledger. No panel operation, provider test or money movement occurs.

## Validation

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Tests cover completed/partial/pending/canceled/refunded orders, customer/provider refunds and embedded adjustments, duplicate/conflicting sync events, missing costs, historical rate independence, exact daily expense allocation, multiple currencies, timezone boundaries, financial CSV safety, durable SQLite reopen, atomic history, stale edits, idempotent creates, signed sessions, and the unchanged fail-closed Phase 2 client. Production PostgreSQL connectivity is an outstanding deployment prerequisite, not a passing test claim.
