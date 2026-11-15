import { describe, expect, it } from "vitest";
import { completeHousehold } from "./fixtures";
import { householdSchema, stepPatchSchemas } from "./schema";
import { MAX_COUNT } from "./types";

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
    ["another schema version", { schemaVersion: 2 }],
    ["a bad timestamp", { updatedAt: "yesterday" }],
    ["an unknown status", { status: "done" }],
    ["an unknown housing type", { housingType: "tent" }],
    ["an unknown need", { needs: ["pizza"] }],
    ["duplicate needs", { needs: ["specialDiet", "specialDiet"] }],
    ["duplicate steps", { completedSteps: ["people", "people"] }],
  ])("rejects %s", (_name, override) => {
    expect(ok({ ...completeHousehold(), ...override })).toBe(false);
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
