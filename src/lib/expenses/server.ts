import "server-only";
import postgres from "postgres";
import { ExpenseRepository, type Database } from "./repository";
let repository: Promise<ExpenseRepository> | undefined;
let database: Promise<Database> | undefined;
export function expenseStorageConfigured() {
  return (
    !!process.env.DATABASE_URL ||
    (process.env.NODE_ENV !== "production" &&
      !!process.env.EXPENSES_SQLITE_PATH)
  );
}
export function applicationDatabase(): Promise<Database> {
  if (!expenseStorageConfigured()) throw Error("STORAGE_UNAVAILABLE");
  if (!database)
    database = (async () => {
      let db: Database;
      if (process.env.DATABASE_URL) {
        const sql = postgres(process.env.DATABASE_URL, {
          max: 3,
          ssl: "verify-full",
          connect_timeout: 10,
          idle_timeout: 20,
          onnotice: () => {},
          debug: false,
        });
        const adapt = (client: typeof sql): Database => ({
          async query(statement, args = []) {
            let n = 0;
            return (await client.unsafe(
              statement.replace(/\?/g, () => `$${++n}`),
              args as string[],
            )) as Record<string, unknown>[];
          },
          async transaction(fn) {
            return (await client.begin(async (transaction) =>
              fn(adapt(transaction as unknown as typeof sql)),
            )) as Awaited<ReturnType<typeof fn>>;
          },
        });
        db = adapt(sql);
      } else {
        const { sqliteDatabase } = await import("./sqlite");
        db = sqliteDatabase(process.env.EXPENSES_SQLITE_PATH!);
      }
      return db;
    })().catch(() => {
      database = undefined;
      throw Error("STORAGE_UNAVAILABLE");
    });
  return database;
}
export function expenseRepository(): Promise<ExpenseRepository> {
  if (!repository)
    repository = (async () => {
      const repo = new ExpenseRepository(await applicationDatabase());
      await repo.initialize();
      return repo;
    })().catch(() => {
      repository = undefined;
      throw Error("STORAGE_UNAVAILABLE");
    });
  return repository;
}
