import { describe, expect, it } from "vitest";
import { toRows } from "./contract";
import { completeHousehold, TEST_TIME } from "./fixtures";
import {
  decodeListCreatedAt,
  decodePlanCreatedAt,
  decodeRow,
  encodeColumns,
  encodeValue,
  normalizeTimestamp,
  RowDecodeError,
  SQLITE_COLUMNS,
  type SqliteRow,
} from "./powersync-codec";
import { TABLE_COLUMNS, TABLES, type HouseholdEmergencyRow, type HouseholdTickRow } from "./rows";

const USER_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const rows = toRows(completeHousehold());
const tick: HouseholdTickRow = {
  id: `${completeHousehold().id}:pet-water`,
  household_id: completeHousehold().id,
  item: "pet-water",
  selected: true,
  quantity: 1.5,
  updated_at: TEST_TIME,
  field_ts: { item: TEST_TIME, selected: TEST_TIME, quantity: TEST_TIME },
};

const emergency: HouseholdEmergencyRow = {
  id: `${completeHousehold().id}:flood`,
  household_id: completeHousehold().id,
  emergency: "flood",
  selected: true,
  updated_at: TEST_TIME,
  field_ts: { emergency: TEST_TIME, selected: TEST_TIME },
};

/** A row as SQLite returns it: every column, encoded, NULL where empty. */
function stored(fields: Record<string, unknown>, table: keyof typeof TABLE_COLUMNS): SqliteRow {
  const { columns, values } = encodeColumns(fields);
  const out: SqliteRow = Object.fromEntries(TABLE_COLUMNS[table].map((c) => [c, null]));
  columns.forEach((column, i) => (out[column] = values[i]));
  return out;
}

describe("client schema columns", () => {
  it("mirror rows.ts: every column except id, which PowerSync adds", () => {
    for (const table of TABLES) {
      expect(Object.keys(SQLITE_COLUMNS[table])).toEqual(
        TABLE_COLUMNS[table].filter((c) => c !== "id"),
      );
    }
  });

  it("store counts, flags and the version as integers, the rest as text", () => {
    expect(SQLITE_COLUMNS.households).toMatchObject({
      adults: "integer",
      has_pets: "integer",
      schema_version: "integer",
      name: "text",
      housing_type: "text",
      field_ts: "text",
      updated_at: "text",
    });
    expect(SQLITE_COLUMNS.household_needs.selected).toBe("integer");
    expect(SQLITE_COLUMNS.household_steps.step).toBe("text");
  });

  it("store a tick's quantity as a real number, so a fractional amount fits", () => {
    expect(SQLITE_COLUMNS.household_ticks).toMatchObject({
      item: "text",
      selected: "integer",
      quantity: "real",
    });
  });
});

describe("encoding", () => {
  it("stores booleans as 0/1, field_ts as JSON text and nothing as NULL", () => {
    expect(encodeValue("has_pets", true)).toBe(1);
    expect(encodeValue("selected", false)).toBe(0);
    expect(encodeValue("field_ts", { a: TEST_TIME })).toBe(`{"a":"${TEST_TIME}"}`);
    expect(encodeValue("name", null)).toBeNull();
    expect(encodeValue("name", undefined)).toBeNull();
    expect(encodeValue("adults", 2)).toBe(2);
    expect(() => encodeValue("people", { adults: 1 })).toThrow(TypeError);
  });

  it("leaves out undefined columns", () => {
    expect(encodeColumns({ adults: 1, name: undefined, has_pets: false })).toEqual({
      columns: ["adults", "has_pets"],
      values: [1, 0],
    });
  });
});

describe("decoding", () => {
  it("round-trips every table's rows", () => {
    const household = rows.household;
    if (!household) throw new Error("fixture has no household row");
    expect(
      decodeRow("households", { id: household.id, ...stored(household, "households") }),
    ).toEqual(household);
    for (const need of rows.needs) {
      expect(decodeRow("household_needs", stored(need, "household_needs"))).toEqual(need);
    }
    for (const step of rows.steps) {
      expect(decodeRow("household_steps", stored(step, "household_steps"))).toEqual(step);
    }
    expect(decodeRow("household_ticks", stored(tick, "household_ticks"))).toEqual(tick);
    const unticked = { ...tick, selected: false, quantity: 0 };
    expect(decodeRow("household_ticks", stored(unticked, "household_ticks"))).toEqual(unticked);
  });

  it("round-trips an emergency row, selected or not", () => {
    const table = "household_emergencies";
    expect(decodeRow(table, stored(emergency, table))).toEqual(emergency);
    const removed = { ...emergency, selected: false };
    expect(decodeRow(table, stored(removed, table))).toEqual(removed);
  });

  it("rejects an emergency row with an unreadable emergency or selected", () => {
    const table = "household_emergencies";
    for (const bad of [{ emergency: "Flood" }, { emergency: null }, { selected: 2 }]) {
      expect(() => decodeRow(table, { ...stored(emergency, table), ...bad })).toThrow(
        RowDecodeError,
      );
    }
  });

  it("rejects a tick with an unreadable quantity", () => {
    for (const quantity of [null, "1.5", -2]) {
      const bad = { ...stored(tick, "household_ticks"), quantity };
      expect(() => decodeRow("household_ticks", bad), String(quantity)).toThrow(RowDecodeError);
    }
  });

  it("keeps server columns when the server filled them", () => {
    const row = stored(
      { ...rows.needs[0], created_by: USER_ID, updated_by: USER_ID, created_at: TEST_TIME },
      "household_needs",
    );
    expect(decodeRow("household_needs", row)).toMatchObject({
      created_by: USER_ID,
      updated_by: USER_ID,
      created_at: TEST_TIME,
    });
  });

  it("reads the microsecond timestamps the server sends", () => {
    const micro = "2026-11-16T12:34:56.123456Z";
    const row = stored(
      {
        ...rows.needs[0],
        created_at: "2026-11-16 12:34:55.000001+00",
        updated_at: micro,
        field_ts: { need: "2026-11-16 12:34:56.123456+00", selected: micro },
      },
      "household_needs",
    );
    expect(decodeRow("household_needs", row)).toMatchObject({
      created_at: "2026-11-16T12:34:55.000001+00:00",
      updated_at: micro,
      field_ts: { need: "2026-11-16T12:34:56.123456+00:00", selected: micro },
    });
  });

  it("rejects a row that breaks the row schema", () => {
    const bad = stored({ ...rows.needs[0], need: "chocolate" }, "household_needs");
    expect(() => decodeRow("household_needs", bad)).toThrow(RowDecodeError);
  });

  it("rejects unreadable field_ts", () => {
    for (const fieldTs of ["{not json", "[]", "null", JSON.stringify({ selected: "yesterday" })]) {
      const bad = { ...stored(rows.needs[0], "household_needs"), field_ts: fieldTs };
      expect(() => decodeRow("household_needs", bad), fieldTs).toThrow(RowDecodeError);
    }
  });

  it("rejects a flag stored as anything but 0 or 1", () => {
    const bad = { ...stored(rows.needs[0], "household_needs"), selected: 2 };
    expect(() => decodeRow("household_needs", bad)).toThrow(RowDecodeError);
  });

  it("ignores columns the table does not have", () => {
    const row = { ...stored(rows.steps[0], "household_steps"), extra: "x" };
    expect(decodeRow("household_steps", row)).toEqual(rows.steps[0]);
  });
});

describe("normalizeTimestamp", () => {
  it.each([
    ["2026-11-16T12:34:56.123456Z", "2026-11-16T12:34:56.123456Z"],
    ["2026-11-16T12:34:56.123456+00:00", "2026-11-16T12:34:56.123456+00:00"],
    ["2026-11-16 12:34:56.123456Z", "2026-11-16T12:34:56.123456Z"],
    ["2026-11-16 12:34:56.123456+00", "2026-11-16T12:34:56.123456+00:00"],
    ["2026-11-16 12:34:56-05", "2026-11-16T12:34:56-05:00"],
    ["2026-11-16", "2026-11-16"],
  ])("%s → %s", (input, output) => {
    expect(normalizeTimestamp(input)).toBe(output);
  });

  it("keeps the instant", () => {
    expect(Date.parse(normalizeTimestamp("2026-11-16 12:34:56.123456+02"))).toBe(
      Date.parse("2026-11-16T10:34:56.123Z"),
    );
  });
});

describe.each([
  ["decodePlanCreatedAt", decodePlanCreatedAt],
  ["decodeListCreatedAt", decodeListCreatedAt],
])("%s", (_name, decode) => {
  it("reads a stored ISO timestamp", () => {
    expect(decode(TEST_TIME)).toBe(TEST_TIME);
  });

  it("reads the server's text form as ISO", () => {
    expect(decode("2026-11-16 12:34:56.123456+00")).toBe("2026-11-16T12:34:56.123456+00:00");
  });

  it("reads NULL (a row written before the column existed) as not set", () => {
    expect(decode(null)).toBeNull();
  });

  it.each([["yesterday"], [42], [{}]])("reads an unreadable value %j as not set", (value) => {
    expect(decode(value)).toBeNull();
  });
});
