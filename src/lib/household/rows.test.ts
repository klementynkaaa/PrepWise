import { describe, expect, it } from "vitest";
import { toRows } from "./contract";
import { completeHousehold, TEST_ID, TEST_TIME } from "./fixtures";
import {
  entityRowSchema,
  householdNeedRowSchema,
  householdRowSchema,
  householdStepRowSchema,
  HOUSEHOLD_FIELDS,
  ROW_SCHEMA_VERSION,
  rowSchemas,
  setRowId,
  TABLE_COLUMNS,
  TABLES,
  type HouseholdNeedRow,
  type HouseholdRow,
  type HouseholdStepRow,
} from "./rows";
import { MAX_COUNT, NAME_MAX_LENGTH, SCHEMA_VERSION } from "./types";

const OTHER_ID = "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a";
const USER_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

function householdRow(overrides: Record<string, unknown> = {}): HouseholdRow {
  const row = toRows(completeHousehold()).household;
  if (!row) throw new Error("fixture has no household row");
  return { ...row, ...overrides } as HouseholdRow;
}

function needRow(overrides: Record<string, unknown> = {}): HouseholdNeedRow {
  return {
    id: `${TEST_ID}:specialDiet`,
    household_id: TEST_ID,
    need: "specialDiet",
    selected: true,
    updated_at: TEST_TIME,
    field_ts: { need: TEST_TIME, selected: TEST_TIME },
    ...overrides,
  } as HouseholdNeedRow;
}

function stepRow(overrides: Record<string, unknown> = {}): HouseholdStepRow {
  return {
    id: `${TEST_ID}:housing`,
    household_id: TEST_ID,
    step: "housing",
    selected: false,
    updated_at: TEST_TIME,
    field_ts: { step: TEST_TIME, selected: TEST_TIME },
    ...overrides,
  } as HouseholdStepRow;
}

const okHousehold = (value: unknown) => householdRowSchema.safeParse(value).success;
const okNeed = (value: unknown) => householdNeedRowSchema.safeParse(value).success;
const okStep = (value: unknown) => householdStepRowSchema.safeParse(value).success;

describe("column lists (mirrored by the database tests' columns_are)", () => {
  const shared = [
    "id",
    "household_id",
    "created_by",
    "created_at",
    "updated_by",
    "updated_at",
    "field_ts",
  ];

  it("households", () => {
    expect([...TABLE_COLUMNS.households].sort()).toEqual(
      [
        ...shared,
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
      ].sort(),
    );
  });

  it("household_needs", () => {
    expect([...TABLE_COLUMNS.household_needs].sort()).toEqual(
      [...shared, "need", "selected"].sort(),
    );
  });

  it("household_steps", () => {
    expect([...TABLE_COLUMNS.household_steps].sort()).toEqual(
      [...shared, "step", "selected"].sort(),
    );
  });

  it("lists a validator and columns for every table", () => {
    expect(TABLES).toEqual(["households", "household_needs", "household_steps"]);
    expect(Object.keys(rowSchemas)).toEqual([...TABLES]);
    expect(Object.keys(TABLE_COLUMNS)).toEqual([...TABLES]);
  });

  it("lists every household data column as a column of the table", () => {
    for (const field of HOUSEHOLD_FIELDS) expect(TABLE_COLUMNS.households).toContain(field);
  });
});

describe("ROW_SCHEMA_VERSION", () => {
  it("is 2, the same as the assembled household's schema version", () => {
    expect(ROW_SCHEMA_VERSION).toBe(2);
    expect(ROW_SCHEMA_VERSION).toBe(SCHEMA_VERSION);
  });
});

describe("setRowId", () => {
  it("is <household_id>:<element>", () => {
    expect(setRowId(TEST_ID, "pets")).toBe(`${TEST_ID}:pets`);
  });
});

describe("householdRowSchema", () => {
  it("accepts a full row and a row with the server columns filled", () => {
    expect(okHousehold(householdRow())).toBe(true);
    expect(okHousehold(householdRow({ name: "Dom" }))).toBe(true);
    expect(
      okHousehold(
        householdRow({
          created_by: USER_ID,
          created_at: TEST_TIME,
          updated_by: null,
          updated_at: "2026-01-02T04:04:05.000+01:00",
        }),
      ),
    ).toBe(true);
  });

  it.each([
    ["household_id different from id", { household_id: OTHER_ID }],
    ["a non-uuid id", { id: "abc", household_id: "abc" }],
    ["another schema version", { schema_version: 1 }],
    ["an empty name", { name: "" }],
    ["a name that is too long", { name: "x".repeat(NAME_MAX_LENGTH + 1) }],
    ["a count above the limit", { cat: MAX_COUNT + 1 }],
    ["a negative count", { adults: -1 }],
    ["an unknown housing type", { housing_type: "tent" }],
    ["a boolean stored as a number", { has_pets: 1 }],
    ["a bad updated_at", { updated_at: "yesterday" }],
    ["a bad field timestamp", { field_ts: { adults: "yesterday" } }],
    ["field_ts as JSON text (adapters decode it first)", { field_ts: "{}" }],
    ["a created_by that is not a uuid", { created_by: "me" }],
    ["a deleted_at column (households are never soft-deleted)", { deleted_at: null }],
    ["an unknown column", { note: "text" }],
    ["a camelCase column", { smallChildren: 0 }],
  ])("rejects %s", (_name, override) => {
    expect(okHousehold(householdRow(override))).toBe(false);
  });

  it("rejects a row without updated_at or field_ts", () => {
    for (const column of ["updated_at", "field_ts"]) {
      const row: Record<string, unknown> = { ...householdRow() };
      delete row[column];
      expect(okHousehold(row)).toBe(false);
    }
  });
});

describe("set row schemas", () => {
  it("accept rows with a matching id, selected or not", () => {
    expect(okNeed(needRow())).toBe(true);
    expect(okNeed(needRow({ selected: false }))).toBe(true);
    expect(okStep(stepRow())).toBe(true);
  });

  it.each([
    ["another household's prefix", { id: `${OTHER_ID}:specialDiet` }],
    ["another need's suffix", { id: `${TEST_ID}:regularMedicines` }],
    ["no prefix", { id: "specialDiet" }],
    ["a uuid id", { id: TEST_ID }],
  ])("reject a need row id with %s", (_name, override) => {
    expect(okNeed(needRow(override))).toBe(false);
  });

  it("rejects a step row whose id prefix is another household", () => {
    expect(okStep(stepRow({ id: `${OTHER_ID}:housing` }))).toBe(false);
    expect(okStep(stepRow({ household_id: OTHER_ID }))).toBe(false);
  });

  it.each([
    ["an unknown need", okNeed, needRow({ need: "pizza", id: `${TEST_ID}:pizza` })],
    ["an unknown step", okStep, stepRow({ step: "garden", id: `${TEST_ID}:garden` })],
    ["a missing selected", okNeed, needRow({ selected: undefined })],
    ["a deleted_at column (set rows use selected)", okNeed, needRow({ deleted_at: null })],
    ["an unknown column", okStep, stepRow({ extra: 1 })],
  ])("reject %s", (_name, ok, value) => {
    expect(ok(value)).toBe(false);
  });
});

describe("entityRowSchema", () => {
  const entity = {
    id: OTHER_ID,
    household_id: TEST_ID,
    updated_at: TEST_TIME,
    field_ts: {},
    deleted_at: null,
  };

  it("accepts a live and a deleted entity row", () => {
    expect(entityRowSchema.safeParse(entity).success).toBe(true);
    expect(entityRowSchema.safeParse({ ...entity, deleted_at: TEST_TIME }).success).toBe(true);
  });

  it("requires deleted_at and a uuid id", () => {
    const live: Record<string, unknown> = { ...entity };
    delete live.deleted_at;
    expect(entityRowSchema.safeParse(live).success).toBe(false);
    expect(entityRowSchema.safeParse({ ...entity, id: `${TEST_ID}:x` }).success).toBe(false);
  });
});
