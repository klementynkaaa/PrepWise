import { householdSchema, stepPatchSchemas } from "./schema";
import { applyStep, computeStatus, emptyAnswers } from "./steps";
import { HouseholdStoreError } from "./store";
import { SCHEMA_VERSION, type Household, type Step, type StepPatches } from "./types";

export type SaveDeps = {
  now: () => Date;
  newId: () => string;
};

export const defaultDeps: SaveDeps = {
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
};

/**
 * Pure core of `saveStep`, shared by every store. Validates the patch, applies
 * it to the existing record (or a blank one: a new id on first save, or after
 * an invalid record), recomputes the status and validates the result.
 * Throws HouseholdStoreError("invalid") on bad data.
 */
export function buildSavedRecord<S extends Step>(
  current: Household | null,
  step: S,
  patch: StepPatches[S],
  deps: SaveDeps,
): Household {
  const parsed = stepPatchSchemas[step].safeParse(patch);
  if (!parsed.success) throw new HouseholdStoreError("invalid", { cause: parsed.error });

  const answers = applyStep(current ?? emptyAnswers(), step, parsed.data as StepPatches[S]);
  const record: Household = {
    ...answers,
    id: current?.id ?? deps.newId(),
    name: current?.name ?? null,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: deps.now().toISOString(),
    status: computeStatus(answers),
  };
  const checked = householdSchema.safeParse(record);
  if (!checked.success) throw new HouseholdStoreError("invalid", { cause: checked.error });
  return checked.data;
}
