import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createReadOnlyClient,
  PanelError,
  ReadQueue,
  retryDelay,
  validateConfig,
} from "../src/lib/perfect-panel/client-core";
import {
  createReport,
  verifiedOperations,
  type VerifiedReadOperation,
} from "../src/lib/perfect-panel/capabilities";
const config = {
  baseUrl: "https://paksmartpanel.com",
  apiKey: "MOCK-ONLY-NOT-A-REAL-KEY",
};
// Synthetic transport fixture, not an official Perfect Panel endpoint or schema.
const fixture: VerifiedReadOperation = {
  id: "mock",
  method: "GET",
  path: "/__mock_read_only",
  evidence: {
    documentationUrl: "https://example.invalid/test-fixture",
    reviewedAt: "test-only",
    readOnly: true,
  },
  parse(value) {
    if (
      typeof value !== "object" ||
      value === null ||
      !("fixture" in value) ||
      value.fixture !== true
    )
      throw Error("invalid fixture");
    return value;
  },
};
const json = () =>
  new Response('{"fixture":true}', {
    headers: { "content-type": "application/json" },
  });
const queue = () =>
  new ReadQueue(
    () => 0,
    async () => {},
  );
test("production registry has zero verified operations and makes no outbound requests", async () => {
  let calls = 0;
  const client = createReadOnlyClient(config, verifiedOperations, {
    fetcher: async () => {
      calls++;
      return json();
    },
  });
  for (const id of [
    "orders",
    "services",
    "users",
    "payments",
    "pull",
    "https://evil.invalid",
  ])
    await assert.rejects(client.read(id), { code: "UNVERIFIED_OPERATION" });
  assert.equal(calls, 0);
});
test("mock transport sends only GET with a server-side header, no body, no cache, and no redirect following", async () => {
  let calls = 0;
  const client = createReadOnlyClient(config, [fixture], {
    queue: queue(),
    fetcher: async (url, init) => {
      calls++;
      assert.equal(String(url), "https://paksmartpanel.com/__mock_read_only");
      assert.equal(init?.method, "GET");
      assert.equal(init?.body, undefined);
      assert.equal(init?.redirect, "manual");
      assert.equal(init?.cache, "no-store");
      assert.equal(
        (init?.headers as Record<string, string>)["X-Api-Key"],
        config.apiKey,
      );
      return json();
    },
  });
  assert.deepEqual(await client.read("mock"), { fixture: true });
  assert.equal(calls, 1);
});
test("rejects cross-host paths, query parameters, mutations and invalid config before fetch", async () => {
  let calls = 0;
  for (const operation of [
    { ...fixture, path: "https://evil.invalid/" },
    { ...fixture, path: "//evil.invalid/" },
    { ...fixture, path: "/read?op=pull" },
    { ...fixture, path: "/../read" },
    { ...fixture, method: "POST" },
  ]) {
    const client = createReadOnlyClient(
      config,
      [operation as VerifiedReadOperation],
      {
        fetcher: async () => {
          calls++;
          return json();
        },
      },
    );
    await assert.rejects(client.read("mock"), PanelError);
  }
  assert.equal(calls, 0);
  for (const baseUrl of [
    "http://paksmartpanel.com",
    "https://evil.invalid",
    "https://paksmartpanel.com/api/v2",
    "https://user:pass@paksmartpanel.com",
    "https://paksmartpanel.com?x=1",
  ])
    assert.throws(() => validateConfig({ ...config, baseUrl }), {
      code: "CONFIGURATION",
    });
  assert.throws(() => validateConfig({ ...config, apiKey: "bad\nheader" }), {
    code: "CONFIGURATION",
  });
});
test("rate limit honors Retry-After, reports cooldown and performs no automatic retry", async () => {
  let calls = 0;
  let cooldown = 0;
  const q = queue();
  q.cooldown = (seconds) => {
    cooldown = seconds;
  };
  const client = createReadOnlyClient(config, [fixture], {
    queue: q,
    fetcher: async () => {
      calls++;
      return new Response("private response", {
        status: 429,
        headers: { "retry-after": "10" },
      });
    },
  });
  await assert.rejects(client.read("mock"), {
    code: "RATE_LIMIT",
    retryAfterSeconds: 10,
  });
  assert.equal(calls, 1);
  assert.equal(cooldown, 10);
  assert.equal(
    retryDelay(
      "Wed, 21 Oct 2026 00:00:10 GMT",
      Date.parse("2026-10-21T00:00:00Z"),
    ),
    10,
  );
  assert.equal(retryDelay("bad"), 1);
  assert.equal(retryDelay("999999"), 999999);
  const cooling = queue();
  cooling.cooldown(999999);
  await assert.rejects(
    cooling.run(async () => {
      throw Error("Must not run while cooling down");
    }),
    { code: "RATE_LIMIT", retryAfterSeconds: 999999 },
  );
});
test("serial queue spaces concurrent requests at least 250ms apart", async () => {
  let now = 0;
  const times: number[] = [];
  const q = new ReadQueue(
    () => now,
    async (ms) => {
      now += ms;
    },
  );
  await Promise.all(
    Array.from({ length: 8 }, () =>
      q.run(async () => {
        times.push(now);
      }),
    ),
  );
  assert.deepEqual(times, [0, 250, 500, 750, 1000, 1250, 1500, 1750]);
});
test("upstream errors are sanitized and redirects never followed", async () => {
  for (const [status, code] of [
    [302, "REDIRECT"],
    [401, "AUTHENTICATION"],
    [403, "AUTHENTICATION"],
    [500, "HTTP"],
  ] as const) {
    const client = createReadOnlyClient(config, [fixture], {
      queue: queue(),
      fetcher: async () =>
        new Response(config.apiKey, {
          status,
          headers: { location: "https://evil.invalid" },
        }),
    });
    await assert.rejects(
      client.read("mock"),
      (e: unknown) =>
        e instanceof PanelError &&
        e.code === code &&
        !e.message.includes(config.apiKey),
    );
  }
  const client = createReadOnlyClient(config, [fixture], {
    queue: queue(),
    fetcher: async () => {
      throw Error(config.apiKey);
    },
  });
  await assert.rejects(client.read("mock"), {
    code: "NETWORK",
    message: "Perfect Panel request failed: NETWORK",
  });
});
test("invalid JSON, HTML, oversized responses and unverified schemas fail closed", async () => {
  for (const response of [
    new Response("<html>login</html>", {
      headers: { "content-type": "text/html" },
    }),
    new Response("invalid", {
      headers: { "content-type": "application/json" },
    }),
    new Response('{"guessed":true}', {
      headers: { "content-type": "application/json" },
    }),
    new Response("x".repeat(2_000_001), {
      headers: { "content-type": "application/json" },
    }),
  ]) {
    const client = createReadOnlyClient(config, [fixture], {
      queue: queue(),
      fetcher: async () => response,
    });
    await assert.rejects(client.read("mock"), { code: "RESPONSE" });
  }
});
test("configured credentials do not imply connected, live data or a successful sync", () => {
  const report = createReport({
    keyPresent: true,
    basePresent: true,
    attemptedAt: "2026-10-21T00:00:00Z",
  });
  assert.equal(report.state, "not_connected");
  assert.equal(report.liveDataAvailable, false);
  assert.equal(report.remoteRequests, 0);
  assert.equal(report.lastSuccessfulSyncAt, null);
  assert.ok(report.capabilities.every((c) => c.state === "unverified"));
  assert.equal(
    createReport({
      keyPresent: false,
      basePresent: false,
      configurationError: true,
    }).state,
    "error",
  );
});
