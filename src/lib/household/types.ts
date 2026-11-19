/**
 * Household profile model. Plain data only: no doses, no per-person data and
 * no free text. Screens turn these values into words; nothing here is text.
 */

/** Largest count accepted for any person or pet group. One place to change it. */
export const MAX_COUNT = 20;

/** Longest household name, in characters. The same check exists in Postgres. */
export const NAME_MAX_LENGTH = 60;

/**
 * Version of the `Household` shape. Version 1 was the single IndexedDB record
 * of S-01; version 2 adds `name` and is built from the shared rows (`rows.ts`).
 */
export const SCHEMA_VERSION = 2;

/** Every step of the profile, in the order they are asked (pets only when `hasPets`). */
export const STEPS = ["people", "pets", "housing", "needs"] as const;
export type Step = (typeof STEPS)[number];

/** Where navigation can lead: a step, or the overview that follows the last one. */
export type StepTarget = Step | "overview";

export const HOUSING_TYPES = ["flat", "house"] as const;
export type HousingType = (typeof HOUSING_TYPES)[number];

export const NEEDS = [
  "regularMedicines",
  "medicalEquipment",
  "limitedMobility",
  "specialDiet",
] as const;
export type Need = (typeof NEEDS)[number];

export type HouseholdStatus = "draft" | "complete";

export type PeopleCounts = {
  adults: number;
  seniors: number;
  children: number;
  smallChildren: number;
};

export type PetCounts = {
  smallDog: number;
  mediumDog: number;
  largeDog: number;
  cat: number;
  otherSmall: number;
};

/** The answers the person gives, without storage metadata. */
export type HouseholdAnswers = {
  completedSteps: Step[];
  people: PeopleCounts;
  hasPets: boolean;
  pets: PetCounts;
  housingType: HousingType | null;
  needs: Need[];
};

/** The household screens use: answers plus identity and metadata. */
export type Household = HouseholdAnswers & {
  id: string;
  /** Null means unnamed; screens show a default label from `messages/`. */
  name: string | null;
  schemaVersion: typeof SCHEMA_VERSION;
  /** ISO 8601 timestamp of the last change. */
  updatedAt: string;
  status: HouseholdStatus;
};

/**
 * The S-01 record (schema version 1) as IndexedDB stored it: today's answers,
 * no name. Frozen: read once by the v1 import, never written again.
 */
export type HouseholdV1 = HouseholdAnswers & {
  id: string;
  schemaVersion: 1;
  updatedAt: string;
  status: HouseholdStatus;
};

/** What each step saves. The people step also carries the pets yes/no answer. */
export type StepPatches = {
  people: { people: PeopleCounts; hasPets: boolean };
  pets: { pets: PetCounts };
  housing: { housingType: HousingType };
  needs: { needs: Need[] };
};

export type PetKind = keyof PetCounts;
export type PeopleGroup = keyof PeopleCounts;

/**
 * One shopping-list item as stored for the household: whether it is ticked and
 * the plan quantity it was ticked at. `item` is a bundled item id (kebab-case).
 */
export type Tick = {
  item: string;
  selected: boolean;
  quantity: number;
};
