import { z } from "zod";
import { computeStatus } from "./steps";
import {
  HOUSING_TYPES,
  MAX_COUNT,
  NEEDS,
  SCHEMA_VERSION,
  STEPS,
  type Household,
  type Step,
  type StepPatches,
} from "./types";

const count = z.number().int().min(0).max(MAX_COUNT);

const unique = (values: readonly unknown[]) => new Set(values).size === values.length;

export const peopleSchema = z.strictObject({
  adults: count,
  seniors: count,
  children: count,
  smallChildren: count,
});

export const petsSchema = z.strictObject({
  smallDog: count,
  mediumDog: count,
  largeDog: count,
  cat: count,
  otherSmall: count,
});

const stepSchema = z.enum(STEPS);
const needSchema = z.enum(NEEDS);
const housingSchema = z.enum(HOUSING_TYPES);

const needsList = z.array(needSchema).refine(unique, "duplicate needs");
const stepsList = z.array(stepSchema).refine(unique, "duplicate steps");

export const householdSchema: z.ZodType<Household> = z
  .strictObject({
    id: z.uuid(),
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

/** Validators for what each step may save. */
export const stepPatchSchemas: { [S in Step]: z.ZodType<StepPatches[S]> } = {
  people: z.strictObject({ people: peopleSchema, hasPets: z.boolean() }),
  pets: z.strictObject({ pets: petsSchema }),
  housing: z.strictObject({ housingType: housingSchema }),
  needs: z.strictObject({ needs: needsList }),
};
