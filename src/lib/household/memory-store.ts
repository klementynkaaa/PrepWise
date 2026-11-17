import {
  applyChanges,
  assemble,
  newHousehold,
  stepChanges,
  toRows,
  type HouseholdRows,
} from "./contract";
import { defaultDeps, type SaveDeps } from "./save-step";
import type { HouseholdStore, LoadResult } from "./store";
import type { Household } from "./types";

const EMPTY: HouseholdRows = { household: null, needs: [], steps: [] };

/**
 * In-memory store for tests and Storybook, on the same rows and contract
 * functions as the PowerSync store. `initial` is turned into rows with `toRows`.
 */
export function createMemoryStore(
  initial: Household | null = null,
  deps: Partial<SaveDeps> = {},
): HouseholdStore {
  const resolved: SaveDeps = { ...defaultDeps, ...deps };
  let rows: HouseholdRows = initial ? toRows(structuredClone(initial)) : EMPTY;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  return {
    async load(): Promise<LoadResult> {
      const household = assemble(rows);
      return household ? { kind: "found", household } : { kind: "none" };
    },
    async saveStep(step, patch) {
      const now = resolved.now();
      const created = rows.household ? [] : newHousehold(resolved.newId(), now);
      const current = applyChanges(rows, created);
      // Throws before anything is stored when the patch is invalid.
      const next = applyChanges(current, stepChanges(current, step, patch, now));
      rows = next;
      notify();
      const household = assemble(next);
      if (!household) throw new Error("Saved rows have no household");
      return household;
    },
    async clear() {
      rows = EMPTY;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
