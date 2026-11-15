import { describe, expect, it } from "vitest";
import { completeHousehold, TEST_ID, TEST_TIME } from "./fixtures";
import { createMemoryStore } from "./memory-store";
import { HouseholdStoreError } from "./store";

const deps = () => ({ newId: () => TEST_ID, now: () => new Date(TEST_TIME) });
const one = { adults: 1, seniors: 0, children: 0, smallChildren: 0 };

describe("memory store", () => {
  it("starts empty", async () => {
    expect(await createMemoryStore().load()).toEqual({ kind: "none" });
  });

  it("creates the record on first save and keeps its id", async () => {
    let n = 0;
    const store = createMemoryStore(null, {
      newId: () => (n++ === 0 ? TEST_ID : "00000000-0000-4000-8000-000000000000"),
      now: () => new Date(TEST_TIME),
    });
    const first = await store.saveStep("people", { people: one, hasPets: false });
    const second = await store.saveStep("housing", { housingType: "flat" });
    expect(first.id).toBe(TEST_ID);
    expect(second.id).toBe(TEST_ID);
    expect(first.status).toBe("draft");
    expect(first.updatedAt).toBe(TEST_TIME);
  });

  it("goes from draft to complete", async () => {
    const store = createMemoryStore(null, deps());
    await store.saveStep("people", { people: one, hasPets: false });
    await store.saveStep("housing", { housingType: "house" });
    const done = await store.saveStep("needs", { needs: [] });
    expect(done.status).toBe("complete");
    expect(await store.load()).toEqual({ kind: "found", household: done });
  });

  it("rejects invalid patches with a typed error and stores nothing", async () => {
    const store = createMemoryStore(null, deps());
    const bad = { people: { ...one, adults: 99 }, hasPets: false };
    await expect(store.saveStep("people", bad)).rejects.toBeInstanceOf(HouseholdStoreError);
    await expect(store.saveStep("people", bad)).rejects.toMatchObject({ code: "invalid" });
    expect(await store.load()).toEqual({ kind: "none" });
  });

  it("zeroes pets when the answer changes to no", async () => {
    const store = createMemoryStore(completeHousehold(), deps());
    const next = await store.saveStep("people", { people: one, hasPets: false });
    expect(next.pets.cat).toBe(0);
    expect(next.status).toBe("complete");
  });

  it("returns copies, so callers cannot change stored data", async () => {
    const store = createMemoryStore(completeHousehold());
    const loaded = await store.load();
    if (loaded.kind === "found") loaded.household.people.adults = 9;
    const again = await store.load();
    expect(again.kind === "found" && again.household.people.adults).toBe(2);
  });

  it("clears", async () => {
    const store = createMemoryStore(completeHousehold());
    await store.clear();
    expect(await store.load()).toEqual({ kind: "none" });
  });

  it("works with the default id and clock", async () => {
    const record = await createMemoryStore().saveStep("housing", { housingType: "flat" });
    expect(record.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
