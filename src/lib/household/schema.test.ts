import { describe, expect, it } from "vitest";
import { completeHousehold, completeHouseholdV1 } from "./fixtures";
import { householdSchema, householdV1Schema, stepPatchSchemas } from "./schema";
import { MAX_COUNT, NAME_MAX_LENGTH, SCHEMA_VERSION } from "./types";

const ok = (value: unknown) => householdSchema.safeParse(value).success;

describe("householdSchema", () => {
  it("accepts a complete household", () => {
    expect(ok(completeHousehold())).toBe(true);
  });

  it("accepts a draft with nothing answered", () => {
    expect(
      ok(
        completeHousehold({
          status: "draft",
          completedSteps: [],
          people: { adults: 0, seniors: 0, children: 0, smallChildren: 0 },
          hasPets: false,
          pets: { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 },
          housingType: null,
          needs: [],
        }),
      ),
    ).toBe(true);
  });

  it("accepts counts from 0 to the limit and rejects outside it", () => {
    const people = { adults: MAX_COUNT, seniors: 0, children: 0, smallChildren: 0 };
    expect(ok(completeHousehold({ people }))).toBe(true);
    expect(ok(completeHousehold({ people: { ...people, adults: MAX_COUNT + 1 } }))).toBe(false);
    expect(ok(completeHousehold({ people: { ...people, adults: -1 } }))).toBe(false);
    expect(ok(completeHousehold({ people: { ...people, adults: 1.5 } }))).toBe(false);
  });

  it("rejects pet counts outside the limit", () => {
    const pets = { smallDog: 0, mediumDog: 0, largeDog: 0, cat: MAX_COUNT + 1, otherSmall: 0 };
    expect(ok(completeHousehold({ pets }))).toBe(false);
  });

  it.each([
    ["a non-uuid id", { id: "abc" }],
    ["another schema version", { schemaVersion: 1 }],
    ["an empty name", { name: "" }],
    ["a name that is too long", { name: "x".repeat(NAME_MAX_LENGTH + 1) }],
    ["a bad timestamp", { updatedAt: "yesterday" }],
    ["an unknown status", { status: "done" }],
    ["an unknown housing type", { housingType: "tent" }],
    ["an unknown need", { needs: ["pizza"] }],
    ["duplicate needs", { needs: ["specialDiet", "specialDiet"] }],
    ["duplicate steps", { completedSteps: ["people", "people"] }],
  ])("rejects %s", (_name, override) => {
    expect(ok({ ...completeHousehold(), ...override })).toBe(false);
  });

  it("accepts no name or a name of 1 to the limit characters", () => {
    expect(ok(completeHousehold({ name: null }))).toBe(true);
    expect(ok(completeHousehold({ name: "D" }))).toBe(true);
    expect(ok(completeHousehold({ name: "x".repeat(NAME_MAX_LENGTH) }))).toBe(true);
  });

  it("rejects a record without a name field", () => {
    const record: Record<string, unknown> = { ...completeHousehold() };
    delete record.name;
    expect(ok(record)).toBe(false);
  });

  it("rejects extra fields such as free text", () => {
    expect(ok({ ...completeHousehold(), note: "text" })).toBe(false);
  });

  it("rejects non-objects and missing fields", () => {
    expect(ok(null)).toBe(false);
    expect(ok("x")).toBe(false);
    const record: Record<string, unknown> = { ...completeHousehold() };
    delete record.people;
    expect(ok(record)).toBe(false);
  });

  it("rejects a complete status that the answers do not support", () => {
    expect(ok(completeHousehold({ housingType: null }))).toBe(false);
    expect(ok(completeHousehold({ completedSteps: ["people", "housing"] }))).toBe(false);
    expect(
      ok(completeHousehold({ people: { adults: 0, seniors: 0, children: 0, smallChildren: 0 } })),
    ).toBe(false);
  });

  it("rejects a draft status when everything is done", () => {
    expect(ok(completeHousehold({ status: "draft" }))).toBe(false);
  });
});

describe("householdV1Schema", () => {
  const v1 = (value: unknown) => householdV1Schema.safeParse(value).success;

  it("accepts a valid S-01 record now that the current schema version is 2", () => {
    expect(SCHEMA_VERSION).toBe(2);
    expect(v1(completeHouseholdV1())).toBe(true);
    expect(householdV1Schema.parse(completeHouseholdV1())).toEqual(completeHouseholdV1());
  });

  it.each([
    ["the current shape (version 2, with a name)", completeHousehold()],
    ["version 2 without a name", { ...completeHouseholdV1(), schemaVersion: 2 }],
    ["a name field", { ...completeHouseholdV1(), name: null }],
    ["a status the answers do not support", completeHouseholdV1({ housingType: null })],
    ["an unknown need", { ...completeHouseholdV1(), needs: ["pizza"] }],
    ["a non-uuid id", completeHouseholdV1({ id: "abc" })],
  ])("rejects %s", (_name, value) => {
    expect(v1(value)).toBe(false);
  });
});

describe("stepPatchSchemas", () => {
  it("accepts valid patches", () => {
    const people = { adults: 1, seniors: 0, children: 0, smallChildren: 0 };
    expect(stepPatchSchemas.people.safeParse({ people, hasPets: false }).success).toBe(true);
    expect(stepPatchSchemas.housing.safeParse({ housingType: "house" }).success).toBe(true);
    expect(stepPatchSchemas.needs.safeParse({ needs: [] }).success).toBe(true);
  });

  it("rejects invalid patches", () => {
    expect(stepPatchSchemas.housing.safeParse({ housingType: null }).success).toBe(false);
    expect(stepPatchSchemas.needs.safeParse({ needs: ["x"] }).success).toBe(false);
    expect(stepPatchSchemas.pets.safeParse({ pets: { cat: 1 } }).success).toBe(false);
    expect(stepPatchSchemas.people.safeParse({ people: {}, hasPets: true }).success).toBe(false);
  });
});
