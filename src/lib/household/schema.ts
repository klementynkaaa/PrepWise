import { z } from "zod";
import { computeStatus } from "./steps";
import {
  HOUSING_TYPES,
  MAX_COUNT,
  NAME_MAX_LENGTH,
  NEEDS,
  SCHEMA_VERSION,
  STEPS,
  type Household,
  type HouseholdV1,
  type Step,
  type StepPatches,
} from "./types";

/** A person or pet count: a whole number from 0 to MAX_COUNT. */
export const countSchema = z.number().int().min(0).max(MAX_COUNT);

const unique = (values: readonly unknown[]) => new Set(values).size === values.length;

export const peopleSchema = z.strictObject({
  adults: countSchema,
  seniors: countSchema,
  children: countSchema,
  smallChildren: countSchema,
});

export const petsSchema = z.strictObject({
  smallDog: countSchema,
  mediumDog: countSchema,
  largeDog: countSchema,
  cat: countSchema,
  otherSmall: countSchema,
});

export const stepSchema = z.enum(STEPS);
export const needSchema = z.enum(NEEDS);
export const housingSchema = z.enum(HOUSING_TYPES);
/** A household name: 1 to NAME_MAX_LENGTH characters. Null (unnamed) is allowed by callers. */
export const nameSchema = z.string().min(1).max(NAME_MAX_LENGTH);

const needsList = z.array(needSchema).refine(unique, "duplicate needs");
const stepsList = z.array(stepSchema).refine(unique, "duplicate steps");

export const householdSchema: z.ZodType<Household> = z
  .strictObject({
    id: z.uuid(),
    name: nameSchema.nullable(),
    schemaVersion: z.literal(SCHEMA_VERSION),
    updatedAt: z.iso.datetime(),
    status: z.enum(["draft", "complete"]),
    completedSteps: stepsList,
    people: peopleSchema,
    hasPets: z.boolean(),
    pets: petsSchema,
    housingType: housingSchema.nullable(),
    needs: needsList,
  })
  .refine((h) => h.status === computeStatus(h), {
    message: "status does not match the answers",
    path: ["status"],
  });

/** A v1 count, frozen at 0 to 20 (not tied to MAX_COUNT). */
const countV1 = z.number().int().min(0).max(20);

/** The v1 status rule, frozen (not tied to `computeStatus`). */
function statusV1(h: {
  people: { adults: number; seniors: number; children: number; smallChildren: number };
  hasPets: boolean;
  housingType: string | null;
  completedSteps: readonly string[];
}): "draft" | "complete" {
  const required = ["people", "pets", "housing", "needs"].filter((s) => s !== "pets" || h.hasPets);
  const people = h.people.adults + h.people.seniors + h.people.children + h.people.smallChildren;
  const done = required.every((step) => h.completedSteps.includes(step));
  return done && people >= 1 && h.housingType !== null ? "complete" : "draft";
}

/**
 * The S-01 IndexedDB record, schema version 1. A frozen copy of the version 1
 * `householdSchema`: do not edit it when the current shape changes, because it
 * describes data already written on devices. Only the v1 import reads it.
 */
export const householdV1Schema: z.ZodType<HouseholdV1> = z
  .strictObject({
    id: z.uuid(),
    schemaVersion: z.literal(1),
    updatedAt: z.iso.datetime(),
    status: z.enum(["draft", "complete"]),
    completedSteps: z
      .array(z.enum(["people", "pets", "housing", "needs"]))
      .refine(unique, "duplicate steps"),
    people: z.strictObject({
      adults: countV1,
      seniors: countV1,
      children: countV1,
      smallChildren: countV1,
    }),
    hasPets: z.boolean(),
    pets: z.strictObject({
      smallDog: countV1,
      mediumDog: countV1,
      largeDog: countV1,
      cat: countV1,
      otherSmall: countV1,
    }),
    housingType: z.enum(["flat", "house"]).nullable(),
    needs: z
      .array(z.enum(["regularMedicines", "medicalEquipment", "limitedMobility", "specialDiet"]))
      .refine(unique, "duplicate needs"),
  })
  .refine((h) => h.status === statusV1(h), {
    message: "status does not match the answers",
    path: ["status"],
  });

/** Validators for what each step may save. */
export const stepPatchSchemas: { [S in Step]: z.ZodType<StepPatches[S]> } = {
  people: z.strictObject({ people: peopleSchema, hasPets: z.boolean() }),
  pets: z.strictObject({ pets: petsSchema }),
  housing: z.strictObject({ housingType: housingSchema }),
  needs: z.strictObject({ needs: needsList }),
};
