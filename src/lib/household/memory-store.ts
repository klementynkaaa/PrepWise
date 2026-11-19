import {
  applyChanges,
  assemble,
  newHousehold,
  stepChanges,
  tickChanges,
  ticksOf,
  toRows,
  type HouseholdRows,
} from "./contract";
import { defaultDeps, type SaveDeps } from "./save-step";
import { HouseholdStoreError, type HouseholdStore, type LoadResult } from "./store";
import type { Household } from "./types";

const EMPTY: HouseholdRows = { household: null, needs: [], steps: [], ticks: [] };

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
  // Device state, kept apart from the household rows as in `device_state`.
  let planCreatedAt: string | null = null;
  let listCreatedAt: string | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  return {
    async load(): Promise<LoadResult> {
      const household = assemble(rows);
      return household
        ? { kind: "found", household, ticks: ticksOf(rows), planCreatedAt, listCreatedAt }
        : { kind: "none" };
    },
    async saveStep(step, patch) {
      const now = resolved.now();
      const created = rows.household ? [] : newHousehold(resolved.newId(), now);
      const current = applyChanges(rows, created);
      // Throws before anything is stored when the patch is invalid.
      const next = applyChanges(current, stepChanges(current, step, patch, now));
      rows = next;
      // A new household has no plan or list yet.
      if (created.length > 0) {
        planCreatedAt = null;
        listCreatedAt = null;
      }
      notify();
      const household = assemble(next);
      if (!household) throw new Error("Saved rows have no household");
      return household;
    },
    async markPlanCreated() {
      if (!rows.household) throw new HouseholdStoreError("invalid");
      if (planCreatedAt !== null) return;
      planCreatedAt = resolved.now().toISOString();
      notify();
    },
    async markListCreated() {
      if (!rows.household) throw new HouseholdStoreError("invalid");
      if (listCreatedAt !== null) return;
      listCreatedAt = resolved.now().toISOString();
      notify();
    },
    async setTick(itemId, ticked, quantity) {
      // Throws before anything is stored without a household or on bad input.
      const changes = tickChanges(rows, itemId, ticked, quantity, resolved.now());
      if (changes.length === 0) return;
      rows = applyChanges(rows, changes);
      notify();
    },
    async clear() {
      rows = EMPTY;
      planCreatedAt = null;
      listCreatedAt = null;
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
