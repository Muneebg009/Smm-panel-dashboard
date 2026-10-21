import {
  authConfigured,
  passwordMatches,
  createSession,
  requestSession,
  sameOrigin,
  boundedJSON,
  privateHeaders,
  COOKIE_NAME,
} from "@/lib/expenses/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Global lockout avoids trusting spoofable IP headers. Use an upstream/WAF rate
// limit before multi-instance deployment; scrypt work occurs only after this gate.
let attempts: number[] = [];
let blockedUntil = 0;
export async function GET(request: Request) {
  return Response.json(
    { configured: authConfigured(), authenticated: requestSession(request) },
    { headers: privateHeaders },
  );
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Same-origin request required." },
      { status: 403, headers: privateHeaders },
    );
  if (!authConfigured())
    return Response.json(
      { error: "Administrator authentication is not configured." },
      { status: 503, headers: privateHeaders },
    );
  const now = Date.now();
  attempts = attempts.filter((t) => t > now - 600000);
  if (now < blockedUntil || attempts.length >= 5) {
    blockedUntil = Math.max(blockedUntil, now + 600000);
    return Response.json(
      { error: "Too many attempts. Try again in 10 minutes." },
      { status: 429, headers: { ...privateHeaders, "Retry-After": "600" } },
    );
  }
  attempts.push(now);
  let input: unknown;
  try {
    input = await boundedJSON(request);
  } catch {
    return Response.json(
      { error: "Invalid request." },
      { status: 400, headers: privateHeaders },
    );
  }
  const password =
    input && typeof input === "object" && "password" in input
      ? input.password
      : null;
  if (typeof password !== "string" || !passwordMatches(password))
    return Response.json(
      { error: "Invalid credentials." },
      { status: 401, headers: privateHeaders },
    );
  const token = createSession();
  return Response.json(
    { authenticated: true },
    {
      headers: {
        ...privateHeaders,
        "Set-Cookie": `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
      },
    },
  );
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Same-origin request required." },
      { status: 403, headers: privateHeaders },
    );
  return Response.json(
    { authenticated: false },
    {
      headers: {
        ...privateHeaders,
        "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
      },
    },
  );
}
