import type { Household, Step, StepPatches } from "./types";

/** What `load()` found. `invalid` is treated as none by screens. */
export type LoadResult =
  | { kind: "none" }
  | { kind: "found"; household: Household }
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
 * swapped (IndexedDB now, a shared database later, memory in tests).
 */
export interface HouseholdStore {
  load(): Promise<LoadResult>;
  /** Validates, saves the step and returns the stored record. Rejects with HouseholdStoreError. */
  saveStep<S extends Step>(step: S, patch: StepPatches[S]): Promise<Household>;
  /** Removes the stored profile. Rejects with HouseholdStoreError when storage is unavailable. */
  clear(): Promise<void>;
}
