import { emptyAnswers } from "./steps";
import type { Household, HouseholdAnswers } from "./types";

export const TEST_ID = "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";
export const TEST_TIME = "2026-01-02T03:04:05.000Z";

/** A complete household: two adults, one child, a cat, a flat, one need. */
export function completeHousehold(overrides: Partial<Household> = {}): Household {
  return {
    id: TEST_ID,
    schemaVersion: 1,
    updatedAt: TEST_TIME,
    status: "complete",
    completedSteps: ["people", "pets", "housing", "needs"],
    people: { adults: 2, seniors: 0, children: 1, smallChildren: 0 },
    hasPets: true,
    pets: { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 1, otherSmall: 0 },
    housingType: "flat",
    needs: ["regularMedicines"],
    ...overrides,
  };
}

export function answers(overrides: Partial<HouseholdAnswers> = {}): HouseholdAnswers {
  return { ...emptyAnswers(), ...overrides };
}
