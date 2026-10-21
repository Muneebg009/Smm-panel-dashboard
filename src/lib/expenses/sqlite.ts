// Local development/test adapter only. Production must use durable PostgreSQL.
import { DatabaseSync } from "node:sqlite";
import type { Database } from "./repository";
export function sqliteDatabase(path: string): Database & { close: () => void } {
  const connection = new DatabaseSync(path);
  connection.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  let tail: Promise<unknown> = Promise.resolve();
  const db: Database & { close: () => void } = {
    async query(sql, args = []) {
      const statement = connection.prepare(sql);
      return statement.all(...(args as (string | number | null)[])) as Record<
        string,
        unknown
      >[];
    },
    transaction(fn) {
      const work = tail.then(async () => {
        connection.exec("BEGIN IMMEDIATE");
        try {
          const value = await fn(db);
          connection.exec("COMMIT");
          return value;
        } catch (error) {
          connection.exec("ROLLBACK");
          throw error;
        }
      });
      tail = work.catch(() => undefined);
      return work;
    },
    close() {
      connection.close();
    },
  };
  return db;
}
