import type { Household, Step, StepPatches, Tick } from "./types";

/**
 * What `load()` found. `invalid` is treated as none by screens.
 * - `ticks`: the household's shopping-list ticks (synced rows, validated; an
 *   unreadable tick row is left out and never makes the household unreadable).
 * - `emergencies`: the ids of the emergencies the household added to its plan
 *   (selected rows only, validated; an unreadable row is left out).
 * - `planCreatedAt` and `listCreatedAt` are device state, not part of the
 *   household or the synced rows: when this device first created its plan or
 *   its shopping list (ISO timestamp), or null.
 */
export type LoadResult =
  | { kind: "none" }
  | {
      kind: "found";
      household: Household;
      ticks: Tick[];
      emergencies: string[];
      planCreatedAt: string | null;
      listCreatedAt: string | null;
    }
  | { kind: "invalid" }
  | { kind: "unavailable" };

export type HouseholdStoreErrorCode = "invalid" | "unavailable";

/** Why a save or clear failed: bad data, or storage missing, blocked or full. */
export class HouseholdStoreError extends Error {
  readonly code: HouseholdStoreErrorCode;

  constructor(code: HouseholdStoreErrorCode, options?: { cause?: unknown }) {
    super(`Household store error: ${code}`, options);
    this.name = "HouseholdStoreError";
    this.code = code;
  }
}

/**
 * The only way screens reach stored household data. Implementations can be
 * swapped (PowerSync's local database in the app, memory in tests).
 */
export interface HouseholdStore {
  load(): Promise<LoadResult>;
  /** Validates, saves the step and returns the stored record. Rejects with HouseholdStoreError. */
  saveStep<S extends Step>(step: S, patch: StepPatches[S]): Promise<Household>;
  /** Removes the stored profile, its ticks, its emergencies and the plan- and list-created flags. Rejects with HouseholdStoreError when storage is unavailable. */
  clear(): Promise<void>;
  /**
   * Records that this device created a plan for its household. Keeps the first
   * timestamp when it is already set. Rejects with HouseholdStoreError: `invalid`
   * when there is no household yet, `unavailable` when storage fails.
   */
  markPlanCreated(): Promise<void>;
  /**
   * Records that this device created the shopping list for its household, with
   * the same rules as `markPlanCreated`: keeps the first timestamp, rejects with
   * `invalid` without a household and `unavailable` when storage fails.
   */
  markListCreated(): Promise<void>;
  /**
   * Ticks (`ticked: true`, at the plan's current `quantity`) or unticks one
   * shopping-list item. Reads and writes in one write transaction, so two quick
   * ticks never drop each other. Rejects with HouseholdStoreError: `invalid`
   * when there is no household or the item id or quantity is not valid,
   * `unavailable` when storage fails.
   */
  setTick(itemId: string, ticked: boolean, quantity: number): Promise<void>;
  /**
   * Makes the household's chosen emergencies exactly `ids`: new ones are added,
   * the others removed (their rows stay, deselected). Reads and writes in one
   * write transaction. Rejects with HouseholdStoreError: `invalid` when there
   * is no household or an id is not a valid emergency id, `unavailable` when
   * storage fails.
   */
  setEmergencies(ids: readonly string[]): Promise<void>;
  /**
   * Calls `listener` after any change to the stored household: a local save now,
   * changes from other devices once sync is on. Returns a function that unsubscribes.
   */
  subscribe(listener: () => void): () => void;
}
