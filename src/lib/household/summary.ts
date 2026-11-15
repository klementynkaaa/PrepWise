import { peopleTotal } from "./steps";
import type { HouseholdAnswers, HousingType, Need, PeopleCounts, PetCounts } from "./types";

export type HouseholdSummary = {
  people: PeopleCounts;
  peopleTotal: number;
  hasPets: boolean;
  pets: PetCounts;
  petsTotal: number;
  housingType: HousingType | null;
  needs: Need[];
};

/** Plain data for the overview screen. Screens turn it into words. */
export function summarise(draft: HouseholdAnswers): HouseholdSummary {
  const pets = draft.hasPets
    ? { ...draft.pets }
    : { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 };
  return {
    people: { ...draft.people },
    peopleTotal: peopleTotal(draft),
    hasPets: draft.hasPets,
    pets,
    petsTotal: Object.values(pets).reduce((sum, n) => sum + n, 0),
    housingType: draft.housingType,
    needs: [...draft.needs],
  };
}
