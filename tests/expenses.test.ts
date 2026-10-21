import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sqliteDatabase } from "../src/lib/expenses/sqlite";
import {
  ExpenseRepository,
  validateExpense,
} from "../src/lib/expenses/repository";
import {
  createSession,
  validSession,
  passwordMatches,
  sameOrigin,
} from "../src/lib/expenses/auth-core";
const input = {
  date: "2026-10-21",
  amount: "10.25",
  currency: "PKR",
  category: "Hosting",
  description: "App hosting",
  allocationStart: "2026-10-21",
  allocationEnd: "2026-10-21",
  status: "active",
};
test("expense validation rejects negative, imprecise, unsupported and invalid date inputs", () => {
  for (const invalid of [
    { amount: "-1" },
    { amount: "0" },
    { amount: "1.001" },
    { currency: "XYZ" },
    { date: "2026-02-31" },
    { description: "" },
    { allocationEnd: "2026-10-20" },
  ])
    assert.throws(() => validateExpense({ ...input, ...invalid }));
  assert.equal(validateExpense(input).amount, "10.25");
});
test("expenses persist across reopen, audit edits and voids, and reject stale versions", async () => {
  const dir = mkdtempSync(join(tmpdir(), "paksmart-expenses-"));
  const path = join(dir, "expenses.db");
  let db = sqliteDatabase(path);
  try {
    let repo = new ExpenseRepository(db);
    await repo.initialize();
    const first = await repo.save(input);
    const edit = await repo.save({ ...input, amount: "20.50" }, first.id, 1);
    assert.equal(edit.version, 2);
    await assert.rejects(repo.save(input, first.id, 1), { code: "CONFLICT" });
    const voided = await repo.save({ ...input, status: "void" }, first.id, 2);
    assert.equal(voided.version, 3);
    const audit = await repo.history(first.id);
    assert.equal(audit.length, 3);
    assert.equal(audit[1].before?.amount, "10.25");
    assert.equal(audit[1].after.amount, "20.50");
    assert.equal(audit[2].action, "voided");
    db.close();
    db = sqliteDatabase(path);
    repo = new ExpenseRepository(db);
    assert.equal((await repo.list())[0].status, "void");
    assert.equal((await repo.history(first.id)).length, 3);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("transaction rollback keeps expense and audit history atomic", async () => {
  const db = sqliteDatabase(":memory:");
  try {
    const repo = new ExpenseRepository(db);
    await repo.initialize();
    await db.query("DROP TABLE business_expense_history");
    await assert.rejects(repo.save(input));
    assert.deepEqual(await repo.list(), []);
  } finally {
    db.close();
  }
});
test("signed admin sessions expire, reject tampering and enforce same-origin writes", () => {
  const oldPassword = process.env.DASHBOARD_ADMIN_PASSWORD;
  const oldSecret = process.env.DASHBOARD_SESSION_SECRET;
  try {
    process.env.DASHBOARD_ADMIN_PASSWORD = "mock-admin-password-only";
    process.env.DASHBOARD_SESSION_SECRET =
      "mock-session-signing-secret-for-tests-only";
    assert.equal(passwordMatches("incorrect"), false);
    assert.equal(passwordMatches("mock-admin-password-only"), true);
    const now = Date.now();
    const token = createSession(now);
    assert.equal(validSession(token, now), true);
    assert.equal(validSession(token + "x", now), false);
    assert.equal(validSession(token, now + 8 * 60 * 60 * 1000), false);
    const request = (origin: string) =>
      new Request("https://admin.example/api/expenses", {
        headers: {
          host: "admin.example",
          origin,
          "x-paksmart-action": "finance",
        },
      });
    assert.equal(sameOrigin(request("https://evil.example")), false);
    assert.equal(sameOrigin(request("https://admin.example")), true);
    delete process.env.DASHBOARD_ADMIN_PASSWORD;
    assert.equal(validSession(token, now), false);
  } finally {
    if (oldPassword === undefined) delete process.env.DASHBOARD_ADMIN_PASSWORD;
    else process.env.DASHBOARD_ADMIN_PASSWORD = oldPassword;
    if (oldSecret === undefined) delete process.env.DASHBOARD_SESSION_SECRET;
    else process.env.DASHBOARD_SESSION_SECRET = oldSecret;
  }
});
test("a retried create request cannot duplicate an expense or its audit record", async () => {
  const db = sqliteDatabase(":memory:");
  try {
    const repo = new ExpenseRepository(db);
    await repo.initialize();
    const key = "00000000-0000-4000-8000-000000000001";
    const first = await repo.save(input, undefined, undefined, key);
    const replay = await repo.save(input, undefined, undefined, key);
    assert.equal(replay.id, first.id);
    assert.equal((await repo.list()).length, 1);
    assert.equal((await repo.history(first.id)).length, 1);
    await assert.rejects(
      repo.save({ ...input, amount: "99.00" }, undefined, undefined, key),
      { code: "CONFLICT" },
    );
  } finally {
    db.close();
  }
});
