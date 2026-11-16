import { z } from "zod";
import { countSchema, housingSchema, nameSchema, needSchema, stepSchema } from "./schema";

/**
 * Stored row shapes: the single Zod module for every synced table, separate
 * from any storage adapter. Column names are snake_case and match the Postgres
 * columns one to one (`supabase/migrations/`). Fields are only ever added.
 *
 * These are logical rows. A storage adapter encodes them for its database
 * (for example `field_ts` as JSON text and booleans as 0/1 in SQLite) and
 * decodes them back before validating here.
 */

/** Version of the row format. Matches `SCHEMA_VERSION` of the assembled `Household`. */
export const ROW_SCHEMA_VERSION = 2;

/** Synced tables of the household profile. */
export const TABLES = ["households", "household_needs", "household_steps"] as const;
export type TableName = (typeof TABLES)[number];

/** ISO 8601 timestamp; an offset is allowed because the server may send one. */
const timestamp = z.iso.datetime({ offset: true });

/**
 * Column → ISO timestamp of its last change. Keys are not limited to known
 * columns, so a device on an older version still reads rows that a newer one
 * wrote with columns it does not know yet.
 */
export const fieldTsSchema = z.record(z.string(), timestamp);
export type FieldTs = z.infer<typeof fieldTsSchema>;

/**
 * Columns every synced row has. `created_by`, `created_at` and `updated_by`
 * are filled by the server only, so they are optional and nullable here.
 */
const sharedColumns = {
  id: z.string().min(1),
  household_id: z.uuid(),
  created_by: z.uuid().nullable().optional(),
  created_at: timestamp.nullable().optional(),
  updated_by: z.uuid().nullable().optional(),
  updated_at: timestamp,
  field_ts: fieldTsSchema,
};

/** Id of a set row: one row per element of a set, `<household_id>:<element>`. */
export function setRowId(householdId: string, element: string): string {
  return `${householdId}:${element}`;
}

// --- households ---------------------------------------------------------------

/** The flat profile columns, in table order. */
export const HOUSEHOLD_FIELDS = [
  "name",
  "adults",
  "seniors",
  "children",
  "small_children",
  "has_pets",
  "small_dog",
  "medium_dog",
  "large_dog",
  "cat",
  "other_small",
  "housing_type",
  "schema_version",
] as const;
export type HouseholdField = (typeof HOUSEHOLD_FIELDS)[number];

const householdShape = {
  ...sharedColumns,
  id: z.uuid(),
  name: nameSchema.nullable(),
  adults: countSchema,
  seniors: countSchema,
  children: countSchema,
  small_children: countSchema,
  has_pets: z.boolean(),
  small_dog: countSchema,
  medium_dog: countSchema,
  large_dog: countSchema,
  cat: countSchema,
  other_small: countSchema,
  housing_type: housingSchema.nullable(),
  schema_version: z.literal(ROW_SCHEMA_VERSION),
};

/**
 * One household. `id` is a client UUID and `household_id` equals it (in
 * Postgres a generated column), so every synced table is scoped by the same
 * column. Households are never soft-deleted, so there is no `deleted_at`.
 */
export const householdRowSchema = z
  .strictObject(householdShape)
  .refine((row) => row.household_id === row.id, {
    message: "household_id must equal id",
    path: ["household_id"],
  });
export type HouseholdRow = z.infer<typeof householdRowSchema>;

// --- set rows -----------------------------------------------------------------

/** Data columns of a set row: its element and whether it is in the set. */
export const HOUSEHOLD_NEED_FIELDS = ["need", "selected"] as const;
export const HOUSEHOLD_STEP_FIELDS = ["step", "selected"] as const;

const householdNeedShape = { ...sharedColumns, need: needSchema, selected: z.boolean() };
const householdStepShape = { ...sharedColumns, step: stepSchema, selected: z.boolean() };

/** One need of a household. Removing it sets `selected: false`; the row stays. */
export const householdNeedRowSchema = z
  .strictObject(householdNeedShape)
  .refine((row) => row.id === setRowId(row.household_id, row.need), {
    message: "id must be <household_id>:<need>",
    path: ["id"],
  });
export type HouseholdNeedRow = z.infer<typeof householdNeedRowSchema>;

/** One confirmed step of the profile, with the same rules as a need. */
export const householdStepRowSchema = z
  .strictObject(householdStepShape)
  .refine((row) => row.id === setRowId(row.household_id, row.step), {
    message: "id must be <household_id>:<step>",
    path: ["id"],
  });
export type HouseholdStepRow = z.infer<typeof householdStepRowSchema>;

// --- entity rows (for later slices) -------------------------------------------

/**
 * Base for entity rows (S-02 to S-07, for example an inventory item): a client
 * UUID id, the shared columns and `deleted_at`. Once `deleted_at` is set the
 * server ignores later edits (delete wins). No table uses it yet; extend it
 * with `z.strictObject({ ...entityRowShape, ...ownColumns })`.
 */
export const entityRowShape = {
  ...sharedColumns,
  id: z.uuid(),
  deleted_at: timestamp.nullable(),
};
export const entityRowSchema = z.strictObject(entityRowShape);
export type EntityRow = z.infer<typeof entityRowSchema>;

// --- column lists --------------------------------------------------------------

/**
 * Every column of each table. The database tests check the Postgres tables
 * against the same lists (`columns_are`), and `rows.test.ts` keeps a snapshot.
 */
export const TABLE_COLUMNS: { [T in TableName]: readonly string[] } = {
  households: Object.keys(householdShape),
  household_needs: Object.keys(householdNeedShape),
  household_steps: Object.keys(householdStepShape),
};

export type Row = HouseholdRow | HouseholdNeedRow | HouseholdStepRow;

/** Row type stored in each table. */
export type RowOf<T extends TableName> = {
  households: HouseholdRow;
  household_needs: HouseholdNeedRow;
  household_steps: HouseholdStepRow;
}[T];

/** Validators per table, for reading rows back at the storage boundary. */
export const rowSchemas: { [T in TableName]: z.ZodType<RowOf<T>> } = {
  households: householdRowSchema,
  household_needs: householdNeedRowSchema,
  household_steps: householdStepRowSchema,
};
