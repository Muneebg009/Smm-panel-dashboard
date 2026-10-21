import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
export const COOKIE_NAME = "paksmart_admin";
const lifetime = 60 * 60 * 8;
export function authConfigured() {
  return (
    (process.env.DASHBOARD_ADMIN_PASSWORD?.length ?? 0) >= 16 &&
    (process.env.DASHBOARD_SESSION_SECRET?.length ?? 0) >= 32
  );
}
export function passwordMatches(password: string) {
  if (!authConfigured() || password.length > 1024) return false;
  const salt = "paksmart-admin-password-check";
  return timingSafeEqual(
    scryptSync(password, salt, 32),
    scryptSync(process.env.DASHBOARD_ADMIN_PASSWORD!, salt, 32),
  );
}
export function createSession(now = Date.now()) {
  if (!authConfigured()) throw Error("AUTH_UNAVAILABLE");
  const payload = `${Math.floor(now / 1000) + lifetime}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${createHmac("sha256", process.env.DASHBOARD_SESSION_SECRET!).update(payload).digest("hex")}`;
}
export function validSession(
  token: string | undefined,
  now = Date.now(),
): boolean {
  if (!authConfigured() || !token || token.length > 200) return false;
  const parts = token.split(".");
  if (
    parts.length !== 3 ||
    !/^\d+$/.test(parts[0]) ||
    !/^[a-f0-9]{32}$/.test(parts[1]) ||
    !/^[a-f0-9]{64}$/.test(parts[2])
  )
    return false;
  const expiry = Number(parts[0]);
  const current = Math.floor(now / 1000);
  if (expiry <= current || expiry > current + lifetime) return false;
  const signature = createHmac("sha256", process.env.DASHBOARD_SESSION_SECRET!)
    .update(parts[0] + "." + parts[1])
    .digest();
  return timingSafeEqual(signature, Buffer.from(parts[2], "hex"));
}
export function requestSession(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(COOKIE_NAME + "="))
    ?.slice(COOKIE_NAME.length + 1);
  return validSession(token);
}
export function sameOrigin(request: Request) {
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    return (
      origin.host === request.headers.get("host") &&
      origin.protocol === new URL(request.url).protocol &&
      request.headers.get("x-paksmart-action") === "finance"
    );
  } catch {
    return false;
  }
}
export const privateHeaders = {
  "Cache-Control": "no-store, private",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie",
};
export async function boundedJSON(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 12000)
    throw Error("INVALID");
  const reader = request.body?.getReader();
  if (!reader) throw Error("INVALID");
  let text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      text += decoder.decode(chunk.value, { stream: true });
      if (text.length > 12000) {
        await reader.cancel();
        throw Error("INVALID");
      }
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } finally {
    reader.releaseLock();
  }
}
