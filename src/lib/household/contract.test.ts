import { describe, expect, it } from "vitest";
import {
  applyChanges,
  assemble,
  migrateV1,
  newHousehold,
  stepChanges,
  toRows,
  type HouseholdRows,
  type RowChange,
} from "./contract";
import { completeHousehold, completeHouseholdV1, TEST_ID, TEST_TIME } from "./fixtures";
import { HOUSEHOLD_FIELDS, rowSchemas, type HouseholdRow } from "./rows";
import { buildSavedRecord } from "./save-step";
import { HouseholdStoreError } from "./store";
import type { Household, Step, StepPatches } from "./types";

const NOW = new Date("2026-03-04T05:06:07.000Z");
const NOW_ISO = NOW.toISOString();
const OTHER_ID = "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a";
const one = { adults: 1, seniors: 0, children: 0, smallChildren: 0 };
const noPets = { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 };

function rowsOf(household: Household = completeHousehold()): HouseholdRows {
  return toRows(household);
}

function withHousehold(rows: HouseholdRows, overrides: Partial<HouseholdRow>): HouseholdRows {
  if (!rows.household) throw new Error("no household row");
  return { ...rows, household: { ...rows.household, ...overrides } };
}

/** Every change is a valid row (insert) or names exactly its changed columns in field_ts (patch). */
function expectWellFormed(changes: readonly RowChange[], at: string) {
  for (const change of changes) {
    const { updated_at, field_ts, ...columns } = change.fields;
    expect(updated_at).toBe(at);
    if (change.op === "insert") {
      expect(rowSchemas[change.table].safeParse(change.fields).success).toBe(true);
      expect(change.fields.id).toBe(change.id);
      const data = Object.keys(columns).filter((c) => c !== "id" && c !== "household_id");
      expect(Object.keys(field_ts).sort()).toEqual(data.sort());
    } else {
      expect(Object.keys(field_ts).sort()).toEqual(Object.keys(columns).sort());
      expect(Object.keys(columns).length).toBeGreaterThan(0);
    }
    for (const ts of Object.values(field_ts)) expect(ts).toBe(at);
  }
}

describe("migrateV1", () => {
  it("round-trips a v1 record through rows and assemble", () => {
    const rows = migrateV1(completeHouseholdV1());
    expect(assemble(rows)).toEqual(completeHousehold());
  });

  it("round-trips a draft without pets, keeping the answers given so far", () => {
    const v1 = completeHouseholdV1({
      status: "draft",
      completedSteps: ["people", "housing"],
      hasPets: false,
      pets: noPets,
      needs: ["specialDiet", "regularMedicines"],
    });
    const household = assemble(migrateV1(v1));
    expect(household).toEqual({
      ...v1,
      name: null,
      schemaVersion: 2,
      needs: ["regularMedicines", "specialDiet"],
    });
  });

  it("makes valid rows whose field_ts are all the v1 updatedAt", () => {
    const rows = migrateV1(completeHouseholdV1());
    expect(rows.household && householdKeys(rows.household.field_ts)).toEqual(
      [...HOUSEHOLD_FIELDS].sort(),
    );
    expect(rows.needs.map((r) => r.id)).toEqual([`${TEST_ID}:regularMedicines`]);
    expect(rows.steps.map((r) => r.step)).toEqual(["people", "pets", "housing", "needs"]);
    const all = [rows.household, ...rows.needs, ...rows.steps];
    for (const row of all) {
      expect(row?.updated_at).toBe(TEST_TIME);
      expect(new Set(Object.values(row?.field_ts ?? {}))).toEqual(new Set([TEST_TIME]));
    }
    expect(rowSchemas.households.safeParse(rows.household).success).toBe(true);
    for (const r of rows.needs) expect(rowSchemas.household_needs.safeParse(r).success).toBe(true);
    for (const r of rows.steps) expect(rowSchemas.household_steps.safeParse(r).success).toBe(true);
  });

  it.each([
    ["the current (version 2) shape", completeHousehold()],
    ["a broken record", { id: "x", nonsense: true }],
    ["nothing", undefined],
  ])("rejects %s as invalid", (_name, record) => {
    expect(() => migrateV1(record)).toThrow(HouseholdStoreError);
    try {
      migrateV1(record);
    } catch (error) {
      expect(error).toMatchObject({ code: "invalid" });
    }
  });
});

function householdKeys(fieldTs: Record<string, string>) {
  return Object.keys(fieldTs).sort();
}

describe("assemble", () => {
  it("returns null without a household row", () => {
    expect(assemble({ household: null, needs: [], steps: [] })).toBeNull();
  });

  it("ignores set rows with selected: false", () => {
    const rows = rowsOf();
    rows.needs = rows.needs.map((r) => ({ ...r, selected: false }));
    rows.steps = rows.steps.map((r) => (r.step === "needs" ? { ...r, selected: false } : r));
    const household = assemble(rows);
    expect(household?.needs).toEqual([]);
    expect(household?.completedSteps).toEqual(["people", "pets", "housing"]);
    expect(household?.status).toBe("draft");
  });

  it("returns needs and steps in the canonical order", () => {
    const rows = rowsOf(
      completeHousehold({ needs: ["specialDiet", "medicalEquipment", "regularMedicines"] }),
    );
    rows.steps.reverse();
    const household = assemble(rows);
    expect(household?.needs).toEqual(["regularMedicines", "medicalEquipment", "specialDiet"]);
    expect(household?.completedSteps).toEqual(["people", "pets", "housing", "needs"]);
  });

  it("reads has_pets: false with cat: 1 as zero pets and ignores the pets step", () => {
    const rows = withHousehold(rowsOf(), { has_pets: false, cat: 1 });
    const household = assemble(rows);
    expect(household?.hasPets).toBe(false);
    expect(household?.pets).toEqual(noPets);
    expect(household?.completedSteps).toEqual(["people", "housing", "needs"]);
    expect(household?.status).toBe("complete");
  });

  it("computes the status instead of storing it", () => {
    expect(assemble(withHousehold(rowsOf(), { housing_type: null }))?.status).toBe("draft");
    expect(assemble(withHousehold(rowsOf(), { adults: 0, children: 0 }))?.status).toBe("draft");
  });

  it("takes updatedAt from the latest row, in UTC", () => {
    const rows = rowsOf();
    rows.needs[0] = { ...rows.needs[0], updated_at: "2026-05-01T12:00:00.000+02:00" };
    rows.steps[1] = { ...rows.steps[1], updated_at: "2026-04-01T00:00:00.000Z" };
    expect(assemble(rows)?.updatedAt).toBe("2026-05-01T10:00:00.000Z");
  });

  it("ignores rows of another household", () => {
    const rows = rowsOf();
    const foreign = toRows(completeHousehold({ id: OTHER_ID, needs: ["specialDiet"] }));
    rows.needs.push({ ...foreign.needs[0], updated_at: "2030-01-01T00:00:00.000Z" });
    const household = assemble(rows);
    expect(household?.needs).toEqual(["regularMedicines"]);
    expect(household?.updatedAt).toBe(TEST_TIME);
  });

  it("carries the name", () => {
    expect(assemble(rowsOf(completeHousehold({ name: "Dom" })))?.name).toBe("Dom");
  });
});

describe("newHousehold", () => {
  it("is one insert of a blank, valid household row stamped for every column", () => {
    const changes = newHousehold(TEST_ID, NOW);
    expect(changes).toHaveLength(1);
    const [change] = changes;
    expect(change).toMatchObject({ table: "households", id: TEST_ID, op: "insert" });
    expectWellFormed(changes, NOW_ISO);
    expect(householdKeys(change.fields.field_ts)).toEqual([...HOUSEHOLD_FIELDS].sort());
    expect(assemble(applyChanges({ household: null, needs: [], steps: [] }, changes))).toEqual({
      id: TEST_ID,
      name: null,
      schemaVersion: 2,
      updatedAt: NOW_ISO,
      status: "draft",
      completedSteps: [],
      people: { adults: 0, seniors: 0, children: 0, smallChildren: 0 },
      hasPets: false,
      pets: noPets,
      housingType: null,
      needs: [],
    });
  });
});

describe("stepChanges", () => {
  it.each<[Step, StepPatches[Step]]>([
    ["people", { people: completeHousehold().people, hasPets: true }],
    ["pets", { pets: completeHousehold().pets }],
    ["housing", { housingType: "flat" }],
    ["needs", { needs: ["regularMedicines"] }],
  ])("gives no changes for an unchanged %s save", (step, patch) => {
    expect(stepChanges(rowsOf(), step, patch, NOW)).toEqual([]);
  });

  it("removing a need gives one selected: false patch, and re-adding gives selected: true", () => {
    const rows = rowsOf();
    const id = `${TEST_ID}:regularMedicines`;
    const removed = stepChanges(rows, "needs", { needs: [] }, NOW);
    expect(removed).toEqual([
      {
        table: "household_needs",
        id,
        op: "patch",
        fields: { selected: false, updated_at: NOW_ISO, field_ts: { selected: NOW_ISO } },
      },
    ]);

    const later = new Date("2026-03-05T00:00:00.000Z");
    const afterRemove = applyChanges(rows, removed);
    expect(assemble(afterRemove)?.needs).toEqual([]);
    const readded = stepChanges(afterRemove, "needs", { needs: ["regularMedicines"] }, later);
    expect(readded).toEqual([
      {
        table: "household_needs",
        id,
        op: "patch",
        fields: {
          selected: true,
          updated_at: later.toISOString(),
          field_ts: { selected: later.toISOString() },
        },
      },
    ]);
    expect(assemble(applyChanges(afterRemove, readded))?.needs).toEqual(["regularMedicines"]);
  });

  it("adds a new need as an insert of a valid row, ignoring the order given", () => {
    const changes = stepChanges(
      rowsOf(),
      "needs",
      { needs: ["specialDiet", "regularMedicines"] },
      NOW,
    );
    expect(changes).toEqual([
      {
        table: "household_needs",
        id: `${TEST_ID}:specialDiet`,
        op: "insert",
        fields: {
          id: `${TEST_ID}:specialDiet`,
          household_id: TEST_ID,
          need: "specialDiet",
          selected: true,
          updated_at: NOW_ISO,
          field_ts: { need: NOW_ISO, selected: NOW_ISO },
        },
      },
    ]);
    expectWellFormed(changes, NOW_ISO);
  });

  it("patches only the changed household columns, with field_ts for exactly those", () => {
    const people = { ...completeHousehold().people, adults: 3, smallChildren: 2 };
    const changes = stepChanges(rowsOf(), "people", { people, hasPets: true }, NOW);
    expect(changes).toEqual([
      {
        table: "households",
        id: TEST_ID,
        op: "patch",
        fields: {
          adults: 3,
          small_children: 2,
          updated_at: NOW_ISO,
          field_ts: { adults: NOW_ISO, small_children: NOW_ISO },
        },
      },
    ]);
  });

  it("saving no pets patches has_pets and the non-zero pet counts, and un-confirms the pets step", () => {
    const start = rowsOf(completeHousehold({ pets: { ...noPets, cat: 1, smallDog: 2 } }));
    const changes = stepChanges(
      start,
      "people",
      { people: completeHousehold().people, hasPets: false },
      NOW,
    );
    expect(changes).toEqual([
      {
        table: "households",
        id: TEST_ID,
        op: "patch",
        fields: {
          has_pets: false,
          small_dog: 0,
          cat: 0,
          updated_at: NOW_ISO,
          field_ts: { has_pets: NOW_ISO, small_dog: NOW_ISO, cat: NOW_ISO },
        },
      },
      {
        table: "household_steps",
        id: `${TEST_ID}:pets`,
        op: "patch",
        fields: { selected: false, updated_at: NOW_ISO, field_ts: { selected: NOW_ISO } },
      },
    ]);
  });

  it("does not touch columns or steps the saved step does not own", () => {
    // A merge left has_pets: false with cat: 1 and the pets step confirmed.
    const rows = withHousehold(rowsOf(), { has_pets: false, cat: 1 });
    expect(stepChanges(rows, "housing", { housingType: "flat" }, NOW)).toEqual([]);
    const changes = stepChanges(rows, "housing", { housingType: "house" }, NOW);
    expect(changes.map((c) => [c.table, Object.keys(c.fields.field_ts)])).toEqual([
      ["households", ["housing_type"]],
    ]);
  });

  it("inserts the step row on a step's first save", () => {
    const rows = applyChanges(
      { household: null, needs: [], steps: [] },
      newHousehold(TEST_ID, NOW),
    );
    const later = new Date("2026-03-05T00:00:00.000Z");
    const changes = stepChanges(rows, "housing", { housingType: "house" }, later);
    expect(changes.map((c) => [c.table, c.op, c.id])).toEqual([
      ["households", "patch", TEST_ID],
      ["household_steps", "insert", `${TEST_ID}:housing`],
    ]);
    expectWellFormed(changes, later.toISOString());
  });

  it("produces the same household as the record-based save, over a whole flow", () => {
    let rows = applyChanges({ household: null, needs: [], steps: [] }, newHousehold(TEST_ID, NOW));
    let record: Household | null = null;
    const deps = { newId: () => TEST_ID, now: () => NOW };
    const saves: { [S in Step]: [S, StepPatches[S]] }[Step][] = [
      ["people", { people: one, hasPets: true }],
      ["pets", { pets: { ...noPets, cat: 2 } }],
      ["housing", { housingType: "flat" }],
      ["needs", { needs: ["specialDiet", "limitedMobility"] }],
      ["people", { people: { ...one, seniors: 1 }, hasPets: false }],
      ["needs", { needs: ["limitedMobility"] }],
      ["people", { people: one, hasPets: true }],
      ["needs", { needs: ["specialDiet", "limitedMobility"] }],
    ];
    for (const [step, patch] of saves) {
      const changes = stepChanges(rows, step, patch, NOW);
      expectWellFormed(changes, NOW_ISO);
      rows = applyChanges(rows, changes);
      record = buildSavedRecord(record, step, patch, deps);
      const assembled = assemble(rows);
      expect(assembled).toEqual({ ...record, needs: assembled?.needs });
      expect(new Set(assembled?.needs)).toEqual(new Set(record.needs));
    }
    expect(assemble(rows)?.status).toBe("draft");
  });

  it("rejects an invalid patch", () => {
    const bad = { people: { ...one, adults: 99 }, hasPets: false };
    expect(() => stepChanges(rowsOf(), "people", bad, NOW)).toThrow(HouseholdStoreError);
  });

  it("rejects a save when there is no household row", () => {
    expect(() =>
      stepChanges(
        { household: null, needs: [], steps: [] },
        "housing",
        { housingType: "flat" },
        NOW,
      ),
    ).toThrow(HouseholdStoreError);
  });
});

describe("applyChanges", () => {
  it("merges field_ts per column on a patch", () => {
    const rows = rowsOf();
    const next = applyChanges(rows, [
      {
        table: "households",
        id: TEST_ID,
        op: "patch",
        fields: { cat: 3, updated_at: NOW_ISO, field_ts: { cat: NOW_ISO } },
      },
    ]);
    expect(next.household?.cat).toBe(3);
    expect(next.household?.field_ts).toEqual({ ...rows.household?.field_ts, cat: NOW_ISO });
    expect(rows.household?.cat).toBe(1);
  });

  it("throws on a patch for a missing row", () => {
    const patch = { selected: true, updated_at: NOW_ISO, field_ts: { selected: NOW_ISO } };
    expect(() =>
      applyChanges(rowsOf(), [
        { table: "household_steps", id: `${TEST_ID}:x`, op: "patch", fields: patch },
      ]),
    ).toThrow();
    expect(() =>
      applyChanges({ household: null, needs: [], steps: [] }, [
        {
          table: "households",
          id: TEST_ID,
          op: "patch",
          fields: { cat: 1, updated_at: NOW_ISO, field_ts: { cat: NOW_ISO } },
        },
      ]),
    ).toThrow();
  });
});

describe("toRows", () => {
  it("gives rows only to selected set elements", () => {
    const rows = toRows(
      completeHousehold({ needs: [], completedSteps: ["people"], status: "draft" }),
    );
    expect(rows.needs).toEqual([]);
    expect(rows.steps.map((r) => r.id)).toEqual([`${TEST_ID}:people`]);
  });
});
