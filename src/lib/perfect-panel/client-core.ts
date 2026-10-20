import type { VerifiedReadOperation } from "./capabilities";

export class PanelError extends Error {
  constructor(
    public readonly code:
      | "UNVERIFIED_OPERATION"
      | "CONFIGURATION"
      | "NETWORK"
      | "REDIRECT"
      | "AUTHENTICATION"
      | "RATE_LIMIT"
      | "HTTP"
      | "RESPONSE",
    public readonly retryAfterSeconds?: number,
  ) {
    // Never include remote response text, URLs, headers or fetch exceptions in errors.
    super(`Perfect Panel request failed: ${code}`);
    this.name = "PanelError";
  }
}
export interface ClientConfig {
  baseUrl: string;
  apiKey: string;
}
export function validateConfig(config: ClientConfig): ClientConfig {
  let url: URL;
  try {
    url = new URL(config.baseUrl);
  } catch {
    throw new PanelError("CONFIGURATION");
  }
  if (
    url.origin !== "https://paksmartpanel.com" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    !config.apiKey.trim() ||
    /[\r\n]/.test(config.apiKey)
  )
    throw new PanelError("CONFIGURATION");
  return { baseUrl: url.origin, apiKey: config.apiKey };
}
export function retryDelay(value: string | null, now = Date.now()): number {
  if (!value) return 1;
  const seconds = /^\d+$/.test(value)
    ? Number(value)
    : Math.ceil((Date.parse(value) - now) / 1000);
  return Number.isFinite(seconds) ? Math.max(1, Math.ceil(seconds)) : 1;
}
/** One serial queue shared by every production client in this Node process.
 * Spacing is >=250ms (4 rps). A distributed limiter is required before enabling
 * live endpoints across multiple workers/replicas or alongside other integrations.
 */
export class ReadQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private next = 0;
  private cooldownUntil = 0;
  constructor(
    private clock = Date.now,
    private sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  ) {}
  cooldown(seconds: number) {
    this.cooldownUntil = Math.max(
      this.cooldownUntil,
      this.clock() + seconds * 1000,
    );
  }
  run<T>(operation: () => Promise<T>): Promise<T> {
    const work = this.tail.then(async () => {
      const remaining = this.cooldownUntil - this.clock();
      if (remaining > 0)
        throw new PanelError("RATE_LIMIT", Math.ceil(remaining / 1000));
      const delay = this.next - this.clock();
      if (delay > 0) await this.sleep(delay);
      this.next = this.clock() + 250;
      return operation();
    });
    this.tail = work.catch(() => undefined);
    return work;
  }
}
const sharedQueue = new ReadQueue();
/** Transport is not a public proxy. Only operation IDs in the server-owned registry
 * can be selected; callers cannot supply URLs, paths, methods, bodies or headers.
 * The production registry is EMPTY until documentation review is possible.
 */
export function createReadOnlyClient(
  config: ClientConfig,
  registry: readonly VerifiedReadOperation[],
  options: { fetcher?: typeof fetch; queue?: ReadQueue } = {},
) {
  const fetcher = options.fetcher ?? fetch;
  const queue = options.queue ?? sharedQueue;
  return {
    async read(id: string): Promise<unknown> {
      const operation = registry.find((o) => o.id === id);
      if (
        !operation ||
        operation.method !== "GET" ||
        operation.evidence.readOnly !== true
      )
        throw new PanelError("UNVERIFIED_OPERATION");
      const safe = validateConfig(config);
      const url = new URL(operation.path, safe.baseUrl);
      // Reject cross-host paths, query parameters and path tricks. Future pagination
      // needs its own documented, bounded parameter implementation.
      if (
        !operation.path.startsWith("/") ||
        operation.path.startsWith("//") ||
        url.origin !== safe.baseUrl ||
        url.search ||
        url.hash ||
        url.username ||
        url.password ||
        operation.path.includes("..")
      )
        throw new PanelError("UNVERIFIED_OPERATION");
      return queue.run(async () => {
        let response: Response;
        try {
          response = await fetcher(url, {
            method: "GET",
            headers: { "X-Api-Key": safe.apiKey, Accept: "application/json" },
            cache: "no-store",
            redirect: "manual",
            signal: AbortSignal.timeout(15000),
          });
        } catch {
          throw new PanelError("NETWORK");
        }
        if (response.status >= 300 && response.status < 400)
          throw new PanelError("REDIRECT");
        if (response.status === 401 || response.status === 403)
          throw new PanelError("AUTHENTICATION");
        if (response.status === 429) {
          const delay = retryDelay(response.headers.get("retry-after"));
          queue.cooldown(delay);
          throw new PanelError("RATE_LIMIT", delay);
        }
        if (!response.ok) throw new PanelError("HTTP");
        if (!response.headers.get("content-type")?.includes("application/json"))
          throw new PanelError("RESPONSE");
        const reader = response.body?.getReader();
        if (!reader) throw new PanelError("RESPONSE");
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 2_000_000) {
              await reader.cancel();
              throw new PanelError("RESPONSE");
            }
            chunks.push(value);
          }
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }
          return operation.parse(JSON.parse(new TextDecoder().decode(bytes)));
        } catch {
          throw new PanelError("RESPONSE");
        } finally {
          reader.releaseLock();
        }
      });
    },
  };
}
