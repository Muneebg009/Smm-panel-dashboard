import "server-only";
import {
  applicationDatabase,
  expenseStorageConfigured,
} from "../expenses/server";
import { MappingRepository } from "./mappings";
let repository: Promise<MappingRepository> | undefined;
export function mappingStorageConfigured() {
  return expenseStorageConfigured();
}
export function mappingRepository(): Promise<MappingRepository> {
  if (!repository)
    repository = (async () => {
      const repo = new MappingRepository(await applicationDatabase());
      await repo.initialize();
      return repo;
    })().catch(() => {
      repository = undefined;
      throw Error("MAPPING_STORAGE_UNAVAILABLE");
    });
  return repository;
}
