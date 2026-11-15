import {
  STEPS,
  type HouseholdAnswers,
  type HouseholdStatus,
  type PeopleCounts,
  type PetCounts,
  type Step,
  type StepPatches,
  type StepTarget,
} from "./types";

export const EMPTY_PEOPLE: PeopleCounts = { adults: 0, seniors: 0, children: 0, smallChildren: 0 };
export const EMPTY_PETS: PetCounts = {
  smallDog: 0,
  mediumDog: 0,
  largeDog: 0,
  cat: 0,
  otherSmall: 0,
};

/** A blank profile: nothing answered yet. */
export function emptyAnswers(): HouseholdAnswers {
  return {
    completedSteps: [],
    people: { ...EMPTY_PEOPLE },
    hasPets: false,
    pets: { ...EMPTY_PETS },
    housingType: null,
    needs: [],
  };
}

type StepsInput = Pick<HouseholdAnswers, "hasPets">;

/** The ordered steps to ask. Pets appear only when the household has pets. */
export function stepsFor(draft: StepsInput): Step[] {
  return STEPS.filter((step) => step !== "pets" || draft.hasPets);
}

/**
 * Position for the "step N of M" label. `total` is 4 with pets and 3 without,
 * and the numbers are consecutive. Pass the live answer in `draft.hasPets` so
 * step 1 follows the pets choice as it changes. Returns null for a step that is
 * not part of the flow (pets while `hasPets` is false).
 */
export function stepPosition(
  draft: StepsInput,
  step: Step,
): { current: number; total: number } | null {
  const steps = stepsFor(draft);
  const index = steps.indexOf(step);
  return index === -1 ? null : { current: index + 1, total: steps.length };
}

/** The first step not yet confirmed, or "overview" when every step is done. */
export function firstUnfinishedStep(draft: HouseholdAnswers): StepTarget {
  return stepsFor(draft).find((step) => !draft.completedSteps.includes(step)) ?? "overview";
}

export type NextStepOptions = {
  /** The pets answer before this save. Needed to notice a change from no to yes. */
  previousHasPets?: boolean;
  /**
   * The status before this save. Adding pets to a finished profile makes it a
   * draft again until the pets step is done; this keeps edit mode in that case.
   */
  previousStatus?: HouseholdStatus;
};

/**
 * Where to go after saving `step`. While filling in, it is the next step and
 * then the overview. When editing a finished profile it is the overview, except
 * that switching pets from no to yes goes to the pets step first.
 */
export function nextStepAfter(
  draft: HouseholdAnswers,
  step: Step,
  options: NextStepOptions = {},
): StepTarget {
  const steps = stepsFor(draft);
  const editing = options.previousStatus === "complete" || computeStatus(draft) === "complete";
  if (editing) {
    const petsAdded = step === "people" && options.previousHasPets === false && draft.hasPets;
    return petsAdded && !draft.completedSteps.includes("pets") ? "pets" : "overview";
  }
  const index = steps.indexOf(step);
  return steps[index + 1] ?? "overview";
}

/** People only, never pets. */
export function peopleTotal(draft: Pick<HouseholdAnswers, "people">): number {
  const { adults, seniors, children, smallChildren } = draft.people;
  return adults + seniors + children + smallChildren;
}

/**
 * "complete" only when every required step is done: at least one person,
 * housing chosen, pets confirmed when there are pets, and the needs step
 * confirmed (its list may be empty).
 */
export function computeStatus(draft: HouseholdAnswers): HouseholdStatus {
  const stepsDone = stepsFor(draft).every((step) => draft.completedSteps.includes(step));
  return stepsDone && peopleTotal(draft) >= 1 && draft.housingType !== null ? "complete" : "draft";
}

/**
 * Applies one step's answers and marks the step done. Saving the people step
 * with `hasPets: false` zeroes every pet count and drops the pets step from
 * the completed list, so no stale pets remain.
 */
export function applyStep<S extends Step>(
  draft: HouseholdAnswers,
  step: S,
  patch: StepPatches[S],
): HouseholdAnswers {
  const next: HouseholdAnswers = {
    ...draft,
    people: { ...draft.people },
    pets: { ...draft.pets },
    needs: [...draft.needs],
  };
  switch (step) {
    case "people": {
      const p = patch as StepPatches["people"];
      next.people = { ...p.people };
      next.hasPets = p.hasPets;
      if (!p.hasPets) {
        next.pets = { ...EMPTY_PETS };
      }
      break;
    }
    case "pets":
      next.pets = { ...(patch as StepPatches["pets"]).pets };
      break;
    case "housing":
      next.housingType = (patch as StepPatches["housing"]).housingType;
      break;
    case "needs":
      next.needs = [...(patch as StepPatches["needs"]).needs];
      break;
  }
  const done = new Set<Step>(draft.completedSteps);
  done.add(step);
  if (!next.hasPets) done.delete("pets");
  next.completedSteps = STEPS.filter((s) => done.has(s));
  return next;
}
