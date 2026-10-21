import { randomUUID } from "node:crypto";
import type { Database } from "../expenses/repository";
import { validDate } from "../finance/dates";
import type { ProviderMapping } from "./types";
export class MappingError extends Error {
  constructor(
    public code: "VALIDATION" | "OVERLAP" | "CONFLICT" | "NOT_FOUND",
  ) {
    super(code);
  }
}
export function mappingInput(value: unknown) {
  if (!value || typeof value !== "object") throw new MappingError("VALIDATION");
  const v = value as Record<string, unknown>;
  for (const key of ["serviceId", "providerId"])
    if (
      typeof v[key] !== "string" ||
      !/^[A-Za-z0-9._:-]{1,100}$/.test(v[key] as string)
    )
      throw new MappingError("VALIDATION");
  if (
    typeof v.providerName !== "string" ||
    !v.providerName.trim() ||
    v.providerName.length > 100 ||
    typeof v.note !== "string" ||
    v.note.trim().length < 5 ||
    v.note.length > 500 ||
    !validDate(v.validFrom) ||
    (v.validTo !== null && (!validDate(v.validTo) || v.validTo < v.validFrom))
  )
    throw new MappingError("VALIDATION");
  return {
    serviceId: v.serviceId as string,
    providerId: v.providerId as string,
    providerName: v.providerName.trim(),
    validFrom: v.validFrom,
    validTo: v.validTo as string | null,
    note: v.note.trim(),
  };
}
export class MappingRepository {
  constructor(private db: Database) {}
  async initialize() {
    await this.db.query(
      "CREATE TABLE IF NOT EXISTS manual_provider_mappings (id TEXT PRIMARY KEY, service_id TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL)",
    );
    await this.db.query(
      "CREATE TABLE IF NOT EXISTS manual_provider_mapping_history (id TEXT PRIMARY KEY, mapping_id TEXT NOT NULL, data TEXT NOT NULL)",
    );
    await this.db.query(
      "CREATE TABLE IF NOT EXISTS manual_provider_mapping_locks (service_id TEXT PRIMARY KEY)",
    );
  }
  async list(): Promise<ProviderMapping[]> {
    return (
      await this.db.query(
        "SELECT data FROM manual_provider_mappings ORDER BY id",
      )
    ).map((r) => JSON.parse(String(r.data)));
  }
  async history(id: string) {
    return (
      await this.db.query(
        "SELECT data FROM manual_provider_mapping_history WHERE mapping_id = ? ORDER BY id",
        [id],
      )
    )
      .map(
        (r) =>
          JSON.parse(String(r.data)) as {
            at: string;
            actor: string;
            before: ProviderMapping | null;
            after: ProviderMapping;
          },
      )
      .sort((a, b) => a.after.version - b.after.version);
  }
  async create(value: unknown, requestId: string) {
    const input = mappingInput(value);
    if (!/^[a-f0-9-]{36}$/.test(requestId))
      throw new MappingError("VALIDATION");
    return this.db.transaction(async (db) => {
      for (const lock of [
        `service:${input.serviceId}`,
        `provider:${input.providerId}`,
      ]) {
        await db.query(
          "INSERT INTO manual_provider_mapping_locks (service_id) VALUES (?) ON CONFLICT (service_id) DO NOTHING",
          [lock],
        );
        await db.query(
          "UPDATE manual_provider_mapping_locks SET service_id = service_id WHERE service_id = ?",
          [lock],
        );
      }
      const all = (
        await db.query(
          "SELECT data FROM manual_provider_mappings WHERE service_id = ?",
          [input.serviceId],
        )
      ).map((r) => JSON.parse(String(r.data)) as ProviderMapping);
      const retry = all.find((m) => m.id === requestId);
      if (retry) {
        if (
          Object.entries(input).some(
            ([k, v]) => retry[k as keyof ProviderMapping] !== v,
          )
        )
          throw new MappingError("CONFLICT");
        return retry;
      }
      if (
        all.some(
          (m) =>
            m.active &&
            m.validFrom <= (input.validTo ?? "9999-12-31") &&
            (m.validTo ?? "9999-12-31") >= input.validFrom,
        )
      )
        throw new MappingError("OVERLAP");
      const otherNames = (
        await db.query("SELECT data FROM manual_provider_mappings")
      ).map((r) => JSON.parse(String(r.data)) as ProviderMapping);
      if (
        otherNames.some(
          (m) =>
            m.active &&
            m.providerId === input.providerId &&
            m.providerName !== input.providerName,
        )
      )
        throw new MappingError("CONFLICT");
      const record: ProviderMapping = {
        ...input,
        id: requestId,
        active: true,
        version: 1,
        createdAt: new Date().toISOString(),
      };
      await db.query(
        "INSERT INTO manual_provider_mappings (id,service_id,data,version) VALUES (?,?,?,?)",
        [record.id, record.serviceId, JSON.stringify(record), 1],
      );
      await this.audit(db, null, record);
      return record;
    });
  }
  async deactivate(id: string, version: number) {
    return this.db.transaction(async (db) => {
      const rows = await db.query(
        "SELECT data FROM manual_provider_mappings WHERE id = ?",
        [id],
      );
      if (!rows.length) throw new MappingError("NOT_FOUND");
      const before = JSON.parse(String(rows[0].data)) as ProviderMapping;
      if (before.version !== version || !before.active)
        throw new MappingError("CONFLICT");
      const after = { ...before, active: false, version: before.version + 1 };
      const updated = await db.query(
        "UPDATE manual_provider_mappings SET data = ?,version = ? WHERE id = ? AND version = ? RETURNING id",
        [JSON.stringify(after), after.version, id, version],
      );
      if (!updated.length) throw new MappingError("CONFLICT");
      await this.audit(db, before, after);
      return after;
    });
  }
  private async audit(
    db: Database,
    before: ProviderMapping | null,
    after: ProviderMapping,
  ) {
    await db.query(
      "INSERT INTO manual_provider_mapping_history (id,mapping_id,data) VALUES (?,?,?)",
      [
        randomUUID(),
        after.id,
        JSON.stringify({
          at: new Date().toISOString(),
          actor: "administrator",
          before,
          after,
        }),
      ],
    );
  }
}
