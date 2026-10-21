# Phase 4 — orders, services and provider analytics

This extends the existing Next.js app and reuses the Phase 1 shell/components, Phase 2 fail-closed API client, Phase 3 exact-money ledger and administrator sessions. No new application, Perfect Panel write, paid test, automatic panel sync, or Phase 5 work is included.

## Coverage and source integrity

**Phase 2 still has zero verified official endpoints or response fields.** No actual panel order/service/provider/financial data is fetched by this phase. The production API base, historical cost fields, categories, imported flags, service statuses, provider mappings, order status histories and pagination protocol remain unverified. No speculative `/orders`, `/services`, `/providers` or “pull” call was added.

| Information                                          | Live mode                                           | Demo mode                                                                 |
| ---------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Order IDs, customers, dates, quantities and statuses | Unavailable                                         | Existing 240 Phase 1 fixtures only                                        |
| Partial order support                                | Supported internal status; no verified live field   | Zero partial fixture orders; none invented                                |
| Historical order price/cost snapshots                | Unavailable                                         | Existing order snapshot values; provider cost snapshot is labeled a quote |
| Recognized revenue/cost/gross profit                 | Unavailable                                         | Phase 3 ledger postings, completed fixtures only                          |
| Service ID/name, rates, units                        | Unavailable                                         | Six existing fixtures, rates per 1,000 PKR units                          |
| Category                                             | Unavailable                                         | Existing fixture platform label, explicitly described as such             |
| Imported flag, service status, order history         | Unavailable                                         | Unavailable; not fabricated                                               |
| Provider identity/association                        | Unavailable through API                             | Four existing fixture providers only                                      |
| Manual provider associations                         | Authenticated administrator annotations in this app | Never applied to demo fixtures                                            |

New internal types are not claimed to be API response fields. Future verified adapters must explicitly map their semantics and provenance. Stable order IDs deduplicate identical snapshots; conflicting snapshots fail closed because no official revision-ordering field is known. The engine rejects demo/live mixing and keeps currencies separate. Unknown statuses are visible as Unknown, included in counts/charts and prevent unsupported completion/cancellation-rate claims.

Provider associations on an order are never inferred from a current catalog provider. Manual mappings require explicit IDs, evidence and dates. Verified associations are preserved. Manual annotations alone never make an unavailable dataset available or produce provider statistics.

## Existing pages extended

- **Orders:** total/completed/pending/partial/canceled/processing counts (Unknown when needed), status-card drill-down, status chart, debounced multi-field search, category/provider/currency/status filters, inclusive date ranges, server pagination, historical snapshot and recognized financial columns, read-only details and full-filter CSV export. Status history displays Unavailable when no verified timeline exists.
- **Services:** service/category/association, imported and status capability states, selling/provider rates, rate unit and rate margin, recognized period profitability, sorting/search/filters/export. Editing is disabled. A catalog provider/rate is not asserted to be an order's historical provider/rate.
- **Top Services:** six rankings, each computed globally before selecting its top 20 and paginating: ordered units, recognized revenue, gross profit, lowest gross margin, gross losses, canceled count. With only six fixture services the lists naturally contain at most six rows. No additional services are generated to fill 20 places.
- **Providers:** catalog service counts, order count, recognized provider spending, attributed revenue/profit/margin, completed/canceled rates, separate pending/processing counts, waiting rate, comparison chart and unassigned-order context. Unverified live comparisons remain unavailable, not fabricated zero-count providers. Charts explicitly identify current-page comparisons.

The original public demo dashboard and Phase 3 financial views remain available. The four advanced analytics pages require an administrator session for their data queries, details and exports, including demo-mode queries. Their static page shell can remain public, but protected data is never rendered into it at build time.

## Transparent calculation definitions

All monetary arithmetic/rankings use Phase 3 BigInt minor-unit calculations. Gross margin ordering compares exact fractions by cross-multiplication rather than ranking rounded display percentages. Rates and service-unit margins are separate catalog metadata; they never overwrite historical order costs. Pending orders do not recognize positive sales through Phase 3's rules. Missing costs produce null profit/margin and are excluded from financial rankings, never treated as zero-cost profit.

Analytics filters define an **order-created cohort** in Asia/Karachi time. Recognized monetary values also include only postings within the selected date range for those orders. This is not a replacement for Phase 3's financial-period P&L: a refund of an older order may appear in that P&L while being outside a newly-created-order cohort here. Full historical selling/cost snapshots are separately labeled from recognized amounts.

- Ordered units = requested quantity across all matching statuses, including canceled/pending demand. “Best-selling” is labeled as ordered units, not completed sales. Missing quantity excludes a service from that ranking.
- Completion rate = Completed / all matching orders. Partial is not silently treated as Completed.
- Cancellation rate = Canceled / all matching orders; most-canceled ranking orders by count, with rates displayed separately.
- Waiting rate = (Pending + Processing) / all matching orders. The two counts remain separate in tables/cards.
- Empty denominators or unknown statuses produce Unavailable rates.
- Low-margin flag: <15% recognized gross margin, at least 20 matching orders **and** 5 positively recognized sales.
- High-cancellation flag: ≥20% canceled with at least 20 matching orders.
- Unusual waiting flag: ≥50% pending/processing with at least 20 matching orders.
- Negative-order flag: a known gross loss; no statistical sample requirement is appropriate for a specific known ledger loss.

Insights are descriptive checks, not claims of defective services or proof of provider failure. No paid order/test action is offered. Filters and sample thresholds are visible on the page. Financial totals never combine currencies or use assumed exchange rates. CSV exports preserve exact decimal strings and neutralize spreadsheet formulas.

## Authentication, queries and limits

Reuse the Phase 3 server variables `DASHBOARD_ADMIN_PASSWORD` (strong unique password ≥16 characters) and `DASHBOARD_SESSION_SECRET` (random ≥32 characters). These are dashboard access credentials, **not** Perfect Panel credentials. They must be actual secure server runtime values, not HTTP proxy placeholders, and must never have NEXT_PUBLIC prefixes. See [Phase 3 setup](phase-3-financials.md) for secure Vercel and local configuration.

- `GET /api/analytics` requires a valid HttpOnly signed administrator session for all modes, detail requests and CSVs. No-cache/private responses and a Cookie Vary header are used.
- Requests specify a fixed view/source/ranking/sort/currency enum; no arbitrary API URL, upstream path or action can be supplied.
- Page sizes: 10, 20 or 50; inclusive date ranges: at most 366 days; search: at most 200 characters. Page selection occurs on the server after filtering and ranking. Exports contain all matching rows (or the selected top 20), not only the displayed page, with a 5,000-row bound requiring narrower filters above that limit.
- Date/source/filter changes reset page state. A stale browser request is aborted, and old responses cannot replace a later query. Loading, empty, locked, invalid-input and source-integrity error states are separate.
- Queries read the authorized server-side fixture/capability layer; they do not call Perfect Panel or consume its API rate budget. Phase 2's existing read-only transport/rate guards remain unchanged. The previously documented requirement for a distributed panel-wide limiter still applies before enabling live API calls across workers.
- Administrator authentication retains Phase 3's process-local login throttle. An upstream/WAF limiter is still required for a multi-instance deployment.

## Manual provider mapping (application metadata only)

Configure Phase 3's separate app-owned PostgreSQL `DATABASE_URL` for deployed persistence. Never point it at Perfect Panel's database. Node 24's local SQLite adapter is used only for development/testing, never production or Vercel's ephemeral filesystem. Demo analytics require administrator authentication but do not require a database. Manual mappings do require app storage.

`/api/provider-mappings` is an authenticated local application endpoint, not a Perfect Panel endpoint. GET lists records or their history; POST creates an explicitly attested association; PATCH deactivates local metadata. Writes require a same-origin custom header, bounded JSON and validated IDs/date ranges. Records include service ID, actual provider ID/name entered by the administrator, evidence note, valid-from/to dates, active state, versions and timestamps.

No provider ID is generated on the administrator's behalf. The UUID identifying a _mapping record_ is an internal idempotency key, not a provider ID. Overlapping active mappings for a service are rejected. Conflicting names for one provider identifier are rejected. Service/provider lock rows serialize concurrent creation checks; optimistic versions protect deactivation. Each save/deactivation has a transactional append-only administrator audit record. The API has no deletion operation and never sends a panel mutation. Audit integrity is application-enforced, not protection against a privileged database administrator.

When a verified live dataset becomes available, order associations can use only mappings whose explicit date window contains the order's local creation date; existing verified order associations are not overwritten. Catalog annotations use the selected end date. Inactive mappings are ignored, with history retained. This annotation layer does not populate historical cost fields, fabricate live providers, or affect demo fixtures. Deactivating/correcting a mapping can change future local analytics attribution; the audit record preserves that change.

## Android testing

After this code is published and deployed:

1. In Vercel, configure the same secure administrator variables used for Phase 3, then redeploy. No panel API key is needed for demo analytics. App PostgreSQL is needed only for saved expenses/mappings.
2. Open the dashboard URL in Chrome. Tap **☰ → Orders**. Sign in with the separate dashboard password. Live analytics must show Unavailable until verified API fields exist.
3. Tap **DEMO DATA**. Tap a status summary card; use search, dates, category/provider filters, page size and Next/Previous. The Partial filter correctly has no fixture rows.
4. Tap the order's details arrow. Confirm the price/cost quote is separate from recognized profit and the unsupported history says Unavailable. No cancel/pull/refill control should exist.
5. Tap **Export analytics CSV**. It exports every matching row, not just one page, and labels source, currency and reporting context.
6. Open **Services**: filter category and service status, sort, export and confirm editing is disabled. The fixture imported flag/status remain Unavailable.
7. Open **Top Services**, select each of the six rankings, and inspect known-vs-unavailable metrics. Loss-making may legitimately be empty. No new demo losses were invented.
8. Open **Providers** for comparisons. In Live analytics, tap **Load mappings → Add mapping** only after configuring application storage. Enter actual IDs and evidence from your own records, select explicit dates and attest. This changes this app's metadata only. Use history to review changes and deactivate an incorrect local mapping.

If login is disabled, server administrator variables are missing. If mapping storage is unavailable, configure the dedicated app database. Do not enter the Perfect Panel API key into the login or mapping forms. Local cloud ports are not asserted to be accessible on your phone; use a deployed preview URL or a local development machine. This task does not itself publish/deploy changes.

## Verification

Unit tests include rankings/global top-20 pagination, exact-margin ordering, all statuses, composed filters, totals reconciled to Phase 3, missing costs, cancellation sample sizes, source separation, sync deduplication/conflicts, unassigned providers, dated manual association precedence, overlap/version protection, audit records and CSV coverage. Synthetic test data is never presented as live panel information. Browser checks cover production authenticated queries and Android-sized screens, exports, page controls, and local mapping/expense persistence. Real PostgreSQL deployment connectivity and real API schemas remain unverified because no live database/API capability was supplied.
