import type { PeopleGroup, PetKind } from "@/lib/household";

// Display order of the answers. Words come from the dictionary.
export const PEOPLE_GROUPS: readonly PeopleGroup[] = [
  "adults",
  "seniors",
  "children",
  "smallChildren",
];
export const PET_KINDS: readonly PetKind[] = [
  "smallDog",
  "mediumDog",
  "largeDog",
  "cat",
  "otherSmall",
];
