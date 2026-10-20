import {
  connectionReport,
  refreshData,
  testConnection,
} from "@/lib/perfect-panel/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "no-store, private",
  "X-Content-Type-Options": "nosniff",
};
// Metadata only. Never returns raw panel data, keys, upstream bodies or stack traces.
export async function GET() {
  return Response.json(connectionReport(), { headers });
}
export async function POST(request: Request) {
  let sameOrigin = false;
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    // Next.js may rewrite request.url to its internal listening hostname.
    // Host is the browser's actual request authority, not forwarded-host input.
    sameOrigin =
      origin.host === request.headers.get("host") &&
      origin.protocol === new URL(request.url).protocol &&
      !origin.username &&
      !origin.password &&
      origin.pathname === "/" &&
      !origin.search &&
      !origin.hash;
  } catch {
    /* Missing/opaque origins are rejected. */
  }
  if (!sameOrigin || request.headers.get("x-paksmart-action") !== "read-only")
    return Response.json(
      { error: "Same-origin request required." },
      { status: 403, headers },
    );
  let action: unknown;
  try {
    action = (await request.json()).action;
  } catch {
    return Response.json(
      { error: "Invalid request." },
      { status: 400, headers },
    );
  }
  if (action !== "test" && action !== "refresh")
    return Response.json(
      { error: "Unsupported action." },
      { status: 400, headers },
    );
  const report = await (action === "test" ? testConnection() : refreshData());
  return Response.json(report, { status: 409, headers });
}
