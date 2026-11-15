import { buildSavedRecord, defaultDeps, type SaveDeps } from "./save-step";
import type { HouseholdStore, LoadResult } from "./store";
import type { Household } from "./types";

/** In-memory store for tests and Storybook. Same contract as the IndexedDB store. */
export function createMemoryStore(
  initial: Household | null = null,
  deps: Partial<SaveDeps> = {},
): HouseholdStore {
  const resolved: SaveDeps = { ...defaultDeps, ...deps };
  let record: Household | null = initial ? structuredClone(initial) : null;

  return {
    async load(): Promise<LoadResult> {
      return record ? { kind: "found", household: structuredClone(record) } : { kind: "none" };
    },
    async saveStep(step, patch) {
      record = buildSavedRecord(record, step, patch, resolved);
      return structuredClone(record);
    },
    async clear() {
      record = null;
    },
  };
}
