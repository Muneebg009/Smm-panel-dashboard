# Phase 2 — read-only Perfect Panel integration capability report

## Current outcome

The existing Phase 1 UI is retained. A server-only client transport, fail-closed operation registry, manual connection/refresh controls, and capability report have been added. **No official endpoint was verified and no live request was made. This is not a completed live integration.**

The cloud proxy denied the official documentation URL (`CONNECT tunnel failed, response 403`) on 21 October 2026 (Asia/Karachi). No endpoint or response schema was inferred from typical REST conventions. The credential and base-origin variables were absent from the actual process and environment configuration. Missing documentation is not an authentication failure.

Official documentation supplied by the user: https://demo.perfectpanel.com/admin/adminapi/v2

The user also supplied https://paksmartpanel.com/admin/adminapi/v2/ during implementation. A direct documentation fetch was attempted; it was likewise denied by the proxy (HTTP CONNECT 403). This is a documentation URL, not evidence of the production request base.

The user-supplied demo API base is `https://demo.perfectpanel.com/adminapi/v2`; the production **API base is unverified**. `PERFECT_PANEL_BASE_URL=https://paksmartpanel.com` stores only the permitted panel origin. The code deliberately does not append a guessed `/adminapi/v2` path. `/api/v2` is the customer API and is not used.

## Capabilities

| Capability                    | Official endpoint / fields verified | Current result                                                               |
| ----------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Non-mutating connection test  | None                                | Blocked before outbound HTTP                                                 |
| Orders                        | None                                | Live IDs, dates, statuses, customer refs, quantities and charges unavailable |
| Services                      | None                                | Live IDs, prices, units, currencies and provider associations unavailable    |
| Customers                     | None                                | Live customer details unavailable                                            |
| Payments                      | None                                | Live amounts, currency, state and dates unavailable                          |
| Provider costs / gross profit | None                                | Unavailable; no selling price is substituted for provider cost               |
| Pagination                    | None                                | No guessed page, limit, offset, cursor or pagination loop                    |

Existing TypeScript demo entities remain unchanged. Mapping cannot be implemented honestly until official field names, nullable values, status semantics, rate units, currency and timestamp semantics are known. In particular the Phase 1 `Order` and `Service` require cost/rate fields that may not be supplied by the Admin API. Do not fill unavailable live fields with demo values or zeros. A future live model must represent unavailable fields as null and keep its source explicit before adapting existing views.

All financial cards, reports, exports, providers and tables currently remain **DEMO DATA**. The integration report is configuration metadata, not fabricated live metrics. It never participates in financial totals.

## Security and transport

- `server.ts` imports `server-only`; only it reads the two server environment variables.
- No API key input in the app and no `NEXT_PUBLIC_` credential.
- Requests require an operation ID in the server-owned registry. The production registry is empty. No raw URL, method, query, body or headers can be supplied from the browser.
- Transport permits only explicitly reviewed GET operations. Even GET is not assumed safe without semantic review. Pull, refill, cancel, create, update and payment actions have no implementation.
- Production origin is pinned to HTTPS `paksmartpanel.com`, excluding userinfo, alternate hosts, custom paths, query parameters and fragments.
- Uses `X-Api-Key`, JSON Accept header, no-store, a 15-second abort signal, manual redirect handling, schema parser and a 2 MB response bound. Error text excludes upstream bodies, URLs, headers, secrets and raw exceptions.
- A serial in-process queue spaces attempts by 250 ms (at most 4 per second). HTTP 429 applies Retry-After cooldown (further attempts are rejected locally until expiry); it does not trigger automatic retries or background sync.
- **Before any live operation is enabled**, add authenticated administrator access to all live data and action routes, and a distributed panel-wide limiter for multi-worker/serverless deployments. The current in-process queue alone cannot enforce a panel-wide limit across Vercel replicas or other applications.
- `/api/perfect-panel` returns safe capability metadata only. POST accepts only local `test` and `refresh` actions, requires same Origin and a custom header, and currently always returns HTTP 409 with a blocked report. No action reaches the live panel. All responses disable caching. All other HTTP methods remain unsupported.
- A successful configuration check is not a successful credential test. “Connected” must only be shown after an authenticated verified read succeeds. No successful sync timestamp is invented.

## Android: secure configuration

Never send the API key in chat, source code, GitHub, URLs, screenshots or browser frontend fields. Create/use a restricted read-only Admin API credential in Perfect Panel if the platform supports that permission scope. The exact Perfect Panel key-creation screens were not available for verification.

The Codex Cloud configuration tools support a secret requirement for `PERFECT_PANEL_ADMIN_API_KEY`, restricted to the HTTPS destination `paksmartpanel.com`, and a non-secret `PERFECT_PANEL_BASE_URL` requirement. They were saved in the environment draft, alongside domain additions for `demo.perfectpanel.com` and `paksmartpanel.com`. A draft save does not apply runtime changes or publish the environment.

On Android:

1. Open this Codex cloud environment's **environment settings** in your browser. If controls are hidden on a narrow screen, Chrome's three-dot menu → **Desktop site** can expose the desktop layout.
2. Review the saved network additions: `demo.perfectpanel.com` for official documentation and `paksmartpanel.com` for future authenticated reads. Preserve other allowed destinations.
3. Set the non-secret variable `PERFECT_PANEL_BASE_URL` to `https://paksmartpanel.com`.
4. Find the saved secret requirement **PERFECT_PANEL_ADMIN_API_KEY** and enter the credential into the platform's secure secret-value control. Destination must be `paksmartpanel.com`. Do not put it in an install/start script or an ordinary source file.
5. Save the settings; publish when the environment UI requests publication. Runtime propagation can require a new/restored task. Recheck configuration after the update.

The tools confirm the configuration backend supports these fields; they do **not** expose the current Android UI layout, so exact tap locations or labels beyond environment settings cannot be verified here. If no secure secret-value control is available, do not paste the key into chat; use the supported settings on a desktop browser instead.

Cloud proxy-backed secrets can appear as placeholders in the process and are replaced only on approved HTTPS destinations. Do not validate them by printing or comparing their literal values. The transport must be verified against the cloud's supported HTTPS proxy/CA path before enabling live reads. Network bypasses or disabled TLS checks are not acceptable.

**Codex credentials do not configure Vercel.** For a future Vercel deployment, use Project → Settings → Environment Variables for server-only variables, then redeploy. Do not activate live endpoints on an unauthenticated public dashboard. This change does not deploy or configure Vercel.

## Testing without changing the panel

For now, open **Settings → Check configuration**, **Test connection**, or **Refresh Data**. The result must be Not Connected / documentation blocked, zero panel requests and no successful sync. This is the safe capability test; it is not a live authentication test.

Run `npm test` for synthetic mocked transport tests. The test fixture `/__mock_read_only` and `{fixture:true}` response exist only in tests and are **not** Perfect Panel endpoints/fields. No real credential is used.

After documentation access is restored, review each official method and its semantics, verify the production base from official docs or actual admin configuration, record evidence, implement exact schemas and documented bounded pagination, secure the dashboard and coordinate the rate limit. Then a manual authenticated read can test connection. Do not probe guessed URLs or use a “pull” action as a test.

## Remaining blocker

Allow documentation access in the running environment or supply the relevant official endpoint documentation with response examples. Until then the read-only endpoint, mapping and pagination work is intentionally stopped. Credentials alone do not remove this blocker. Phase 3 is not implemented.
