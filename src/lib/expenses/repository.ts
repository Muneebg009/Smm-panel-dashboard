import { randomUUID } from "node:crypto";
import { minor, decimal, isCurrency } from "../finance/money";
import { validDate, daysBetween } from "../finance/dates";
import { expenseCategories, type FinancialExpense } from "../finance/types";
export interface ExpenseRecord extends FinancialExpense {
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface ExpenseAudit {
  id: string;
  expenseId: string;
  action: "created" | "edited" | "voided";
  actor: "administrator";
  at: string;
  before: ExpenseRecord | null;
  after: ExpenseRecord;
}
export interface Database {
  query(sql: string, args?: unknown[]): Promise<Record<string, unknown>[]>;
  transaction<T>(fn: (db: Database) => Promise<T>): Promise<T>;
}
export class ExpenseError extends Error {
  constructor(public code: "VALIDATION" | "CONFLICT" | "NOT_FOUND") {
    super(code);
  }
}
export function validateExpense(value: unknown): Omit<FinancialExpense, "id"> {
  if (!value || typeof value !== "object") throw new ExpenseError("VALIDATION");
  const v = value as Record<string, unknown>;
  if (
    !isCurrency(v.currency) ||
    typeof v.amount !== "string" ||
    typeof v.description !== "string" ||
    !v.description.trim() ||
    v.description.length > 500 ||
    !expenseCategories.includes(
      v.category as (typeof expenseCategories)[number],
    ) ||
    !validDate(v.date) ||
    !validDate(v.allocationStart) ||
    !validDate(v.allocationEnd) ||
    !["active", "void"].includes(String(v.status))
  )
    throw new ExpenseError("VALIDATION");
  try {
    const amount = minor(v.amount, v.currency);
    if (
      amount <= 0n ||
      amount > 999999999999999999n ||
      daysBetween(v.allocationStart, v.allocationEnd) > 3660
    )
      throw Error();
    return {
      date: v.date,
      amount: decimal(amount, v.currency),
      currency: v.currency,
      description: v.description.trim(),
      category: v.category as (typeof expenseCategories)[number],
      allocationStart: v.allocationStart,
      allocationEnd: v.allocationEnd,
      status: v.status as "active" | "void",
    };
  } catch {
    throw new ExpenseError("VALIDATION");
  }
}
export class ExpenseRepository {
  constructor(private db: Database) {}
  async initialize() {
    await this.db.query(
      "CREATE TABLE IF NOT EXISTS business_expenses (id TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL)",
    );
    await this.db.query(
      "CREATE TABLE IF NOT EXISTS business_expense_history (id TEXT PRIMARY KEY, expense_id TEXT NOT NULL, data TEXT NOT NULL)",
    );
  }
  async list(): Promise<ExpenseRecord[]> {
    const rows = await this.db.query(
      "SELECT data FROM business_expenses ORDER BY id",
    );
    return rows.map((r) => JSON.parse(String(r.data)) as ExpenseRecord);
  }
  async history(id: string): Promise<ExpenseAudit[]> {
    const rows = await this.db.query(
      "SELECT data FROM business_expense_history WHERE expense_id = ? ORDER BY id",
      [id],
    );
    return rows
      .map((r) => JSON.parse(String(r.data)) as ExpenseAudit)
      .sort((a, b) => a.after.version - b.after.version);
  }
  async save(
    value: unknown,
    id?: string,
    version?: number,
    createId?: string,
  ): Promise<ExpenseRecord> {
    const input = validateExpense(value);
    if (id && (!Number.isInteger(version) || Number(version) < 1))
      throw new ExpenseError("VALIDATION");
    return this.db.transaction(async (db) => {
      let before: ExpenseRecord | null = null;
      if (!id && createId) {
        if (!/^[a-f0-9-]{36}$/.test(createId))
          throw new ExpenseError("VALIDATION");
        const existing = await db.query(
          "SELECT data FROM business_expenses WHERE id = ?",
          [createId],
        );
        if (existing.length) {
          const record = JSON.parse(String(existing[0].data)) as ExpenseRecord;
          const {
            id: unusedId,
            version: unusedVersion,
            createdAt: unusedCreated,
            updatedAt: unusedUpdated,
            ...stored
          } = record;
          void unusedId;
          void unusedVersion;
          void unusedCreated;
          void unusedUpdated;
          if (JSON.stringify(stored) !== JSON.stringify(input))
            throw new ExpenseError("CONFLICT");
          return record;
        }
      }
      if (id) {
        const rows = await db.query(
          "SELECT data FROM business_expenses WHERE id = ?",
          [id],
        );
        if (!rows.length) throw new ExpenseError("NOT_FOUND");
        before = JSON.parse(String(rows[0].data));
        if (before!.version !== version) throw new ExpenseError("CONFLICT");
      }
      const now = new Date().toISOString();
      const record: ExpenseRecord = {
        ...input,
        id: id ?? createId ?? randomUUID(),
        version: (before?.version ?? 0) + 1,
        createdAt: before?.createdAt ?? now,
        updatedAt: now,
      };
      if (before) {
        const updated = await db.query(
          "UPDATE business_expenses SET data = ?, version = ? WHERE id = ? AND version = ? RETURNING id",
          [JSON.stringify(record), record.version, record.id, version],
        );
        if (!updated.length) throw new ExpenseError("CONFLICT");
      } else
        await db.query(
          "INSERT INTO business_expenses (id,data,version) VALUES (?,?,?)",
          [record.id, JSON.stringify(record), record.version],
        );
      const audit: ExpenseAudit = {
        id: randomUUID(),
        expenseId: record.id,
        actor: "administrator",
        action: before
          ? record.status === "void" && before.status !== "void"
            ? "voided"
            : "edited"
          : "created",
        at: now,
        before,
        after: record,
      };
      await db.query(
        "INSERT INTO business_expense_history (id,expense_id,data) VALUES (?,?,?)",
        [audit.id, record.id, JSON.stringify(audit)],
      );
      return record;
    });
  }
}
