import { describe, expect, it, vi } from "vitest";
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
    expect(await store.load()).toEqual({
      kind: "found",
      household: done,
      ticks: [],
      planCreatedAt: null,
      listCreatedAt: null,
    });
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

  it("calls subscribers after a save and a clear, until they unsubscribe", async () => {
    const store = createMemoryStore(null, deps());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await store.saveStep("housing", { housingType: "flat" });
    expect(listener).toHaveBeenCalledTimes(1);
    await store.clear();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    await store.saveStep("housing", { housingType: "house" });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("does not call subscribers when a save is rejected", async () => {
    const store = createMemoryStore(null, deps());
    const listener = vi.fn();
    store.subscribe(listener);
    await expect(store.saveStep("housing", { housingType: "tent" as never })).rejects.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });

  it("loads an initial household as it was given", async () => {
    expect(await createMemoryStore(completeHousehold()).load()).toEqual({
      kind: "found",
      household: completeHousehold(),
      ticks: [],
      planCreatedAt: null,
      listCreatedAt: null,
    });
  });

  describe("plan created flag", () => {
    const planCreatedAt = async (store: ReturnType<typeof createMemoryStore>) => {
      const loaded = await store.load();
      return loaded.kind === "found" ? loaded.planCreatedAt : undefined;
    };

    it("is not set by default", async () => {
      expect(await planCreatedAt(createMemoryStore(completeHousehold()))).toBeNull();
    });

    it("is set by markPlanCreated and keeps the first timestamp", async () => {
      let tick = 0;
      const store = createMemoryStore(completeHousehold(), {
        now: () => new Date(Date.parse(TEST_TIME) + 1000 * tick++),
      });
      await store.markPlanCreated();
      await store.markPlanCreated();
      expect(await planCreatedAt(store)).toBe(TEST_TIME);
    });

    it("is kept across a step save", async () => {
      const store = createMemoryStore(completeHousehold(), deps());
      await store.markPlanCreated();
      await store.saveStep("housing", { housingType: "house" });
      expect(await planCreatedAt(store)).toBe(TEST_TIME);
    });

    it("is removed by clear and unset for the next new household", async () => {
      const store = createMemoryStore(completeHousehold(), deps());
      await store.markPlanCreated();
      await store.clear();
      await store.saveStep("housing", { housingType: "flat" });
      expect(await planCreatedAt(store)).toBeNull();
    });

    it("is rejected without a household", async () => {
      const store = createMemoryStore(null, deps());
      await expect(store.markPlanCreated()).rejects.toBeInstanceOf(HouseholdStoreError);
      await expect(store.markPlanCreated()).rejects.toMatchObject({ code: "invalid" });
      expect(await store.load()).toEqual({ kind: "none" });
    });

    it("notifies subscribers once when it is set", async () => {
      const store = createMemoryStore(completeHousehold(), deps());
      const listener = vi.fn();
      store.subscribe(listener);
      await store.markPlanCreated();
      await store.markPlanCreated();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("list created flag", () => {
    const listCreatedAt = async (store: ReturnType<typeof createMemoryStore>) => {
      const loaded = await store.load();
      return loaded.kind === "found" ? loaded.listCreatedAt : undefined;
    };

    it("is not set by default", async () => {
      expect(await listCreatedAt(createMemoryStore(completeHousehold()))).toBeNull();
    });

    it("is set by markListCreated, keeps the first timestamp and leaves the plan flag", async () => {
      let tick = 0;
      const store = createMemoryStore(completeHousehold(), {
        now: () => new Date(Date.parse(TEST_TIME) + 1000 * tick++),
      });
      await store.markListCreated();
      await store.markListCreated();
      expect(await listCreatedAt(store)).toBe(TEST_TIME);
      const loaded = await store.load();
      expect(loaded.kind === "found" && loaded.planCreatedAt).toBeNull();
    });

    it("is removed by clear and unset for the next new household", async () => {
      const store = createMemoryStore(completeHousehold(), deps());
      await store.markListCreated();
      await store.clear();
      await store.saveStep("housing", { housingType: "flat" });
      expect(await listCreatedAt(store)).toBeNull();
    });

    it("is rejected without a household", async () => {
      const store = createMemoryStore(null, deps());
      await expect(store.markListCreated()).rejects.toMatchObject({ code: "invalid" });
      expect(await store.load()).toEqual({ kind: "none" });
    });

    it("notifies subscribers once when it is set", async () => {
      const store = createMemoryStore(completeHousehold(), deps());
      const listener = vi.fn();
      store.subscribe(listener);
      await store.markListCreated();
      await store.markListCreated();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("ticks", () => {
    const ticks = async (store: ReturnType<typeof createMemoryStore>) => {
      const loaded = await store.load();
      return loaded.kind === "found" ? loaded.ticks : undefined;
    };

    it("starts with none", async () => {
      expect(await ticks(createMemoryStore(completeHousehold()))).toEqual([]);
    });

    it("ticks and unticks an item, keeping its quantity", async () => {
      const store = createMemoryStore(completeHousehold(), deps());
      await store.setTick("drinking-water", true, 4.5);
      expect(await ticks(store)).toEqual([
        { item: "drinking-water", selected: true, quantity: 4.5 },
      ]);
      await store.setTick("drinking-water", false, 6);
      expect(await ticks(store)).toEqual([
        { item: "drinking-water", selected: false, quantity: 4.5 },
      ]);
      await store.setTick("drinking-water", true, 6);
      expect(await ticks(store)).toEqual([{ item: "drinking-water", selected: true, quantity: 6 }]);
    });

    it("keeps ticks across a step save, and leaves the profile as it was", async () => {
      const store = createMemoryStore(completeHousehold(), deps());
      await store.setTick("candles", true, 2);
      const saved = await store.saveStep("housing", { housingType: "house" });
      expect(saved.housingType).toBe("house");
      expect(await ticks(store)).toEqual([{ item: "candles", selected: true, quantity: 2 }]);
      const loaded = await store.load();
      expect(loaded.kind === "found" && loaded.household).toEqual(saved);
    });

    it("are removed by clear", async () => {
      const store = createMemoryStore(completeHousehold(), deps());
      await store.setTick("candles", true, 2);
      await store.clear();
      await store.saveStep("housing", { housingType: "flat" });
      expect(await ticks(store)).toEqual([]);
    });

    it("rejects a tick without a household, or with a bad item or quantity", async () => {
      await expect(
        createMemoryStore(null, deps()).setTick("candles", true, 1),
      ).rejects.toMatchObject({ code: "invalid" });
      const store = createMemoryStore(completeHousehold(), deps());
      await expect(store.setTick("Candles", true, 1)).rejects.toBeInstanceOf(HouseholdStoreError);
      await expect(store.setTick("candles", true, -1)).rejects.toMatchObject({ code: "invalid" });
      expect(await ticks(store)).toEqual([]);
    });

    it("returns copies, so callers cannot change stored ticks", async () => {
      const store = createMemoryStore(completeHousehold(), deps());
      await store.setTick("candles", true, 2);
      const first = await ticks(store);
      if (first) first[0].selected = false;
      expect(await ticks(store)).toEqual([{ item: "candles", selected: true, quantity: 2 }]);
    });

    it("notifies subscribers on a change, not on a tick that changes nothing", async () => {
      const store = createMemoryStore(completeHousehold(), deps());
      const listener = vi.fn();
      store.subscribe(listener);
      await store.setTick("candles", true, 2);
      await store.setTick("candles", true, 2);
      await store.setTick("matches", false, 1);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
