import { summarise, type HouseholdSummary } from "@/lib/household/summary";
import { emptyAnswers } from "@/lib/household/steps";
import type { HouseholdAnswers } from "@/lib/household/types";

/** A summary from partial answers; unset groups and pets are zero. */
export function summaryOf(overrides: Partial<HouseholdAnswers> = {}): HouseholdSummary {
  const base = emptyAnswers();
  return summarise({
    ...base,
    ...overrides,
    people: { ...base.people, ...overrides.people },
    pets: { ...base.pets, ...overrides.pets },
  });
}

/** The agreed default plan (`fpp-plan`): 2 adults, a small child, a medium dog; medicines and diet; a flat. */
export const defaultSummary = (): HouseholdSummary =>
  summaryOf({
    people: { adults: 2, seniors: 0, children: 0, smallChildren: 1 },
    hasPets: true,
    pets: { smallDog: 0, mediumDog: 1, largeDog: 0, cat: 0, otherSmall: 0 },
    housingType: "flat",
    needs: ["regularMedicines", "specialDiet"],
  });

/** The minimal plan (`fpp-plan-minimal`): 1 adult in a flat, nothing else. */
export const minimalSummary = (): HouseholdSummary =>
  summaryOf({
    people: { adults: 1, seniors: 0, children: 0, smallChildren: 0 },
    housingType: "flat",
  });

/**
 * The large household (`fpp-plan-long`): 9 people (4 adults, 2 seniors,
 * 2 children, 1 small child), a large and a small dog and a cat, every need, a house.
 */
export const largeSummary = (): HouseholdSummary =>
  summaryOf({
    people: { adults: 4, seniors: 2, children: 2, smallChildren: 1 },
    hasPets: true,
    pets: { smallDog: 1, mediumDog: 0, largeDog: 1, cat: 1, otherSmall: 0 },
    housingType: "house",
    needs: ["regularMedicines", "medicalEquipment", "limitedMobility", "specialDiet"],
  });
