import { PowerSyncDatabase, WASQLiteVFS } from "@powersync/web";
import { afterEach, describe, expect, it } from "vitest";
import { completeHousehold, completeHouseholdV1, TEST_ID, TEST_TIME } from "./fixtures";
import { BACKUP_KEY, RECORD_KEY, STORE_NAME } from "./indexeddb-store";
import { householdSchema } from "./powersync-schema";
import {
  createPowerSyncStore,
  POWERSYNC_WORKER,
  type PowerSyncHouseholdStore,
} from "./powersync-store";

// Store integration tests on PowerSync's real local database (OPFSCoopSyncVFS),
// in Chromium. Each test has its own database file and IndexedDB name.

const one = { adults: 1, seniors: 0, children: 0, smallChildren: 0 };
const deps = { newId: () => TEST_ID, now: () => new Date(TEST_TIME) };
const opened: PowerSyncHouseholdStore[] = [];

function fresh(options: Parameters<typeof createPowerSyncStore>[0] = {}) {
  const id = crypto.randomUUID();
  const names = { dbFilename: `store-${id}.db`, v1DbName: `prepwise-${id}` };
  const store = createPowerSyncStore({ ...names, ...options });
  opened.push(store);
  return { store, ...names };
}

afterEach(async () => {
  await Promise.all(opened.splice(0).map((store) => store.close()));
});

function openIdb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idb<T>(name: string, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openIdb(name);
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** Opens the store's database file directly, after the store has closed it. */
async function inspect<T>(dbFilename: string, run: (db: PowerSyncDatabase) => Promise<T>) {
  const db = new PowerSyncDatabase({
    schema: householdSchema,
    database: { dbFilename, vfs: WASQLiteVFS.OPFSCoopSyncVFS, worker: POWERSYNC_WORKER },
  });
  await db.init();
  try {
    return await run(db);
  } finally {
    await db.close();
  }
}

const count = async (db: PowerSyncDatabase, table: string) =>
  (await db.get<{ n: number }>(`SELECT count(*) AS n FROM ${table}`)).n;

describe("PowerSync household store", () => {
  it("has no household on a fresh database", async () => {
    expect(await fresh().store.load()).toEqual({ kind: "none" });
  });

  it("creates the household on the first save and keeps it across a reopen", async () => {
    const { store, dbFilename, v1DbName } = fresh(deps);
    const first = await store.saveStep("people", { people: one, hasPets: false });
    await store.saveStep("housing", { housingType: "flat" });
    const done = await store.saveStep("needs", { needs: ["specialDiet"] });
    expect(first.id).toBe(TEST_ID);
    expect(done).toMatchObject({ id: TEST_ID, status: "complete", needs: ["specialDiet"] });
    await store.close();

    const again = createPowerSyncStore({ dbFilename, v1DbName });
    opened.push(again);
    expect(await again.load()).toEqual({
      kind: "found",
      household: done,
      ticks: [],
      emergencies: [],
      planCreatedAt: null,
      listCreatedAt: null,
    });
  });

  it("writes only the local-only tables, so nothing waits for upload", async () => {
    const { store, dbFilename } = fresh(deps);
    await store.saveStep("people", { people: one, hasPets: false });
    await store.saveStep("needs", { needs: ["specialDiet", "limitedMobility"] });
    await store.setTick("drinking-water", true, 4);
    await store.setEmergencies(["flood"]);
    await store.close();
    const counts = await inspect(dbFilename, async (db) => ({
      crud: await count(db, "ps_crud"),
      households: await count(db, "households"),
      localHouseholds: await count(db, "local_households"),
      localNeeds: await count(db, "local_household_needs"),
      localSteps: await count(db, "local_household_steps"),
      ticks: await count(db, "household_ticks"),
      localTicks: await count(db, "local_household_ticks"),
      emergencies: await count(db, "household_emergencies"),
      localEmergencies: await count(db, "local_household_emergencies"),
    }));
    expect(counts).toEqual({
      crud: 0,
      households: 0,
      localHouseholds: 1,
      localNeeds: 2,
      localSteps: 2,
      ticks: 0,
      localTicks: 1,
      emergencies: 0,
      localEmergencies: 1,
    });
  });

  it("keeps both answers when the first two saves run at once", async () => {
    // A fresh device: both saves would create a household if they read the same
    // (empty) state, and one set of answers would be lost.
    const { store } = fresh();
    await Promise.all([
      store.saveStep("people", { people: one, hasPets: false }),
      store.saveStep("housing", { housingType: "house" }),
    ]);
    const loaded = await store.load();
    expect(loaded).toMatchObject({
      kind: "found",
      household: { people: one, housingType: "house", completedSteps: ["people", "housing"] },
    });
  });

  it("keeps both answers and both field timestamps when two saves on different steps run at once", async () => {
    let tick = 0;
    const clock = () => new Date(Date.parse(TEST_TIME) + 1000 * tick++);
    const { store, dbFilename } = fresh({ newId: () => TEST_ID, now: clock });
    await store.saveStep("people", { people: one, hasPets: true });
    await Promise.all([
      store.saveStep("pets", {
        pets: { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 2, otherSmall: 0 },
      }),
      store.saveStep("housing", { housingType: "house" }),
    ]);
    const loaded = await store.load();
    expect(loaded).toMatchObject({
      kind: "found",
      household: {
        pets: { cat: 2 },
        housingType: "house",
        completedSteps: ["people", "pets", "housing"],
      },
    });
    await store.close();

    // Each save stamped its own columns; neither overwrote the other's stamp.
    const fieldTs = await inspect(dbFilename, async (db) =>
      JSON.parse(
        (await db.get<{ field_ts: string }>("SELECT field_ts FROM local_households")).field_ts,
      ),
    );
    const people = fieldTs.adults;
    expect(Date.parse(fieldTs.cat)).toBeGreaterThan(Date.parse(people));
    expect(Date.parse(fieldTs.housing_type)).toBeGreaterThan(Date.parse(people));
    expect(fieldTs.cat).not.toBe(fieldTs.housing_type);
  });

  it("removes a need by marking it unselected, and adds it back", async () => {
    const { store } = fresh(deps);
    await store.saveStep("needs", { needs: ["specialDiet", "limitedMobility"] });
    const removed = await store.saveStep("needs", { needs: ["limitedMobility"] });
    expect(removed.needs).toEqual(["limitedMobility"]);
    const back = await store.saveStep("needs", { needs: ["specialDiet"] });
    expect(back.needs).toEqual(["specialDiet"]);
    expect(await store.load()).toEqual({
      kind: "found",
      household: back,
      ticks: [],
      emergencies: [],
      planCreatedAt: null,
      listCreatedAt: null,
    });
  });

  it("rejects an invalid patch with a typed error and writes nothing", async () => {
    const { store } = fresh(deps);
    await expect(store.saveStep("housing", { housingType: "tent" as never })).rejects.toMatchObject(
      { code: "invalid" },
    );
    expect(await store.load()).toEqual({ kind: "none" });
  });

  it("calls subscribers after a write, and stops after unsubscribing", async () => {
    const { store } = fresh(deps);
    await store.load(); // opens the database
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });
    await store.saveStep("housing", { housingType: "flat" });
    await expect.poll(() => calls).toBeGreaterThan(0);

    unsubscribe();
    const before = calls;
    await store.saveStep("housing", { housingType: "house" });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(calls).toBe(before);
  });

  it("clears the device's household", async () => {
    const { store } = fresh(deps);
    await store.saveStep("housing", { housingType: "flat" });
    await store.clear();
    expect(await store.load()).toEqual({ kind: "none" });
  });

  describe("v1 import", () => {
    it("imports a valid v1 record once and removes `current`", async () => {
      const { store, v1DbName, dbFilename } = fresh(deps);
      await idb(v1DbName, (s) => s.put(completeHouseholdV1(), RECORD_KEY));

      expect(await store.load()).toEqual({
        kind: "found",
        household: completeHousehold(),
        ticks: [],
        emergencies: [],
        planCreatedAt: null,
        listCreatedAt: null,
      });
      expect(await idb(v1DbName, (s) => s.get(RECORD_KEY))).toBeUndefined();
      expect(await idb(v1DbName, (s) => s.get(BACKUP_KEY))).toBeUndefined();

      // Later saves build on the imported household, and a reopen does not import again.
      const saved = await store.saveStep("housing", { housingType: "house" });
      expect(saved).toMatchObject({ id: TEST_ID, housingType: "house", status: "complete" });
      await store.close();
      const again = createPowerSyncStore({ dbFilename, v1DbName });
      opened.push(again);
      expect(await again.load()).toEqual({
        kind: "found",
        household: saved,
        ticks: [],
        emergencies: [],
        planCreatedAt: null,
        listCreatedAt: null,
      });
    });

    it("does not overwrite newer edits when `current` is still there on a later open", async () => {
      const { store, v1DbName, dbFilename } = fresh(deps);
      await idb(v1DbName, (s) => s.put(completeHouseholdV1(), RECORD_KEY));
      await store.load();
      const saved = await store.saveStep("housing", { housingType: "house" });
      await store.close();

      // As if deleting `current` had failed, or a second tab read it before the delete.
      await idb(v1DbName, (s) => s.put(completeHouseholdV1(), RECORD_KEY));
      const again = createPowerSyncStore({ dbFilename, v1DbName });
      opened.push(again);

      expect(await again.load()).toEqual({
        kind: "found",
        household: saved,
        ticks: [],
        emergencies: [],
        planCreatedAt: null,
        listCreatedAt: null,
      });
      expect(await idb(v1DbName, (s) => s.get(RECORD_KEY))).toBeUndefined();
    });

    it("keeps an invalid v1 record under BACKUP_KEY and starts empty", async () => {
      const { store, v1DbName } = fresh(deps);
      const broken = { id: "x", nonsense: true };
      await idb(v1DbName, (s) => s.put(broken, RECORD_KEY));

      expect(await store.load()).toEqual({ kind: "none" });
      expect(await idb(v1DbName, (s) => s.get(BACKUP_KEY))).toEqual(broken);
      expect(await idb(v1DbName, (s) => s.get(RECORD_KEY))).toBeUndefined();
    });
  });

  describe("plan created flag", () => {
    const planCreatedAt = async (store: PowerSyncHouseholdStore) => {
      const loaded = await store.load();
      return loaded.kind === "found" ? loaded.planCreatedAt : undefined;
    };

    it("is not set by default", async () => {
      const { store } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      expect(await planCreatedAt(store)).toBeNull();
    });

    it("is set by markPlanCreated, keeps the first timestamp and survives a reopen", async () => {
      let tick = 0;
      const clock = () => new Date(Date.parse(TEST_TIME) + 1000 * tick++);
      const { store, dbFilename, v1DbName } = fresh({ newId: () => TEST_ID, now: clock });
      await store.saveStep("housing", { housingType: "flat" });
      await store.markPlanCreated();
      const first = await planCreatedAt(store);
      await store.markPlanCreated();
      expect(await planCreatedAt(store)).toBe(first);
      expect(first).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      await store.close();

      const again = createPowerSyncStore({ dbFilename, v1DbName });
      opened.push(again);
      expect(await planCreatedAt(again)).toBe(first);
    });

    it("is kept across a step save, with the household row intact", async () => {
      const { store } = fresh(deps);
      const saved = await store.saveStep("housing", { housingType: "flat" });
      await store.markPlanCreated();
      const next = await store.saveStep("housing", { housingType: "house" });
      expect(next.id).toBe(saved.id);
      expect(await store.load()).toEqual({
        kind: "found",
        household: next,
        ticks: [],
        emergencies: [],
        planCreatedAt: TEST_TIME,
        listCreatedAt: null,
      });
    });

    it("is unset when a new household is created", async () => {
      const { store, dbFilename, v1DbName } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await store.markPlanCreated();
      await store.close();
      // Unreadable rows: the next save starts a new household.
      await inspect(dbFilename, (db) => db.execute("DELETE FROM local_households"));

      // A new id: the old household's step rows are still in the database.
      const again = createPowerSyncStore({ dbFilename, v1DbName });
      opened.push(again);
      expect(await again.load()).toEqual({ kind: "invalid" });
      await again.saveStep("housing", { housingType: "house" });
      expect(await planCreatedAt(again)).toBeNull();
    });

    it("is removed by clear", async () => {
      const { store, dbFilename } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await store.markPlanCreated();
      await store.clear();
      await store.close();
      expect(await inspect(dbFilename, (db) => count(db, "device_state"))).toBe(0);
    });

    it("is rejected without a household, and writes nothing", async () => {
      const { store, dbFilename } = fresh(deps);
      await expect(store.markPlanCreated()).rejects.toMatchObject({ code: "invalid" });
      expect(await store.load()).toEqual({ kind: "none" });
      await store.close();
      expect(await inspect(dbFilename, (db) => count(db, "device_state"))).toBe(0);
    });

    it("calls subscribers when it is set", async () => {
      const { store } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await new Promise((resolve) => setTimeout(resolve, 200)); // let the save's event pass
      let calls = 0;
      store.subscribe(() => {
        calls += 1;
      });
      await store.markPlanCreated();
      await expect.poll(() => calls).toBeGreaterThan(0);
    });
  });

  describe("list created flag", () => {
    const listCreatedAt = async (store: PowerSyncHouseholdStore) => {
      const loaded = await store.load();
      return loaded.kind === "found" ? loaded.listCreatedAt : undefined;
    };

    it("is set by markListCreated, keeps the first timestamp and survives a reopen", async () => {
      let tick = 0;
      const clock = () => new Date(Date.parse(TEST_TIME) + 1000 * tick++);
      const { store, dbFilename, v1DbName } = fresh({ newId: () => TEST_ID, now: clock });
      await store.saveStep("housing", { housingType: "flat" });
      expect(await listCreatedAt(store)).toBeNull();
      await store.markListCreated();
      const first = await listCreatedAt(store);
      await store.markListCreated();
      expect(await listCreatedAt(store)).toBe(first);
      expect(first).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      const loaded = await store.load();
      expect(loaded.kind === "found" && loaded.planCreatedAt).toBeNull();
      await store.close();

      const again = createPowerSyncStore({ dbFilename, v1DbName });
      opened.push(again);
      expect(await listCreatedAt(again)).toBe(first);
    });

    it("is unset when a new household is created", async () => {
      const { store, dbFilename, v1DbName } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await store.markListCreated();
      await store.close();
      await inspect(dbFilename, (db) => db.execute("DELETE FROM local_households"));

      const again = createPowerSyncStore({ dbFilename, v1DbName });
      opened.push(again);
      await again.saveStep("housing", { housingType: "house" });
      expect(await listCreatedAt(again)).toBeNull();
    });

    it("is removed by clear", async () => {
      const { store, dbFilename } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await store.markListCreated();
      await store.clear();
      await store.close();
      expect(await inspect(dbFilename, (db) => count(db, "device_state"))).toBe(0);
    });

    it("is rejected without a household, and writes nothing", async () => {
      const { store, dbFilename } = fresh(deps);
      await expect(store.markListCreated()).rejects.toMatchObject({ code: "invalid" });
      await store.close();
      expect(await inspect(dbFilename, (db) => count(db, "device_state"))).toBe(0);
    });
  });

  describe("ticks", () => {
    const ticks = async (store: PowerSyncHouseholdStore) => {
      const loaded = await store.load();
      return loaded.kind === "found" ? loaded.ticks : undefined;
    };

    it("ticks and unticks an item, keeping a fractional quantity, across a reopen", async () => {
      const { store, dbFilename, v1DbName } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await store.setTick("pet-water", true, 1.5);
      expect(await ticks(store)).toEqual([{ item: "pet-water", selected: true, quantity: 1.5 }]);
      await store.setTick("pet-water", false, 3);
      expect(await ticks(store)).toEqual([{ item: "pet-water", selected: false, quantity: 1.5 }]);
      await store.setTick("pet-water", true, 3);
      await store.setTick("candles", true, 2);
      await store.close();

      const again = createPowerSyncStore({ dbFilename, v1DbName });
      opened.push(again);
      expect(await ticks(again)).toEqual(
        expect.arrayContaining([
          { item: "pet-water", selected: true, quantity: 3 },
          { item: "candles", selected: true, quantity: 2 },
        ]),
      );
      expect(await ticks(again)).toHaveLength(2);
    });

    it("keeps every tick when several run at once", async () => {
      const { store } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await store.setTick("matches", true, 1);
      await Promise.all([
        store.setTick("candles", true, 2),
        store.setTick("drinking-water", true, 4),
        store.setTick("matches", false, 1),
      ]);
      const loaded = await ticks(store);
      expect(loaded).toHaveLength(3);
      expect(loaded).toEqual(
        expect.arrayContaining([
          { item: "candles", selected: true, quantity: 2 },
          { item: "drinking-water", selected: true, quantity: 4 },
          { item: "matches", selected: false, quantity: 1 },
        ]),
      );
    });

    it("rejects a tick without a household, and writes nothing", async () => {
      const { store, dbFilename } = fresh(deps);
      await expect(store.setTick("candles", true, 1)).rejects.toMatchObject({ code: "invalid" });
      await store.close();
      expect(await inspect(dbFilename, (db) => count(db, "local_household_ticks"))).toBe(0);
    });

    it("rejects a bad item id or quantity", async () => {
      const { store } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await expect(store.setTick("Candles", true, 1)).rejects.toMatchObject({ code: "invalid" });
      await expect(store.setTick("candles", true, -1)).rejects.toMatchObject({ code: "invalid" });
      expect(await ticks(store)).toEqual([]);
    });

    it("are removed by clear", async () => {
      const { store, dbFilename } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await store.setTick("candles", true, 2);
      await store.clear();
      await store.close();
      expect(await inspect(dbFilename, (db) => count(db, "local_household_ticks"))).toBe(0);
    });

    it("calls subscribers after a tick", async () => {
      const { store } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await new Promise((resolve) => setTimeout(resolve, 200)); // let the save's event pass
      let calls = 0;
      store.subscribe(() => {
        calls += 1;
      });
      await store.setTick("candles", true, 2);
      await expect.poll(() => calls).toBeGreaterThan(0);
    });

    describe("with an unreadable tick row", () => {
      /** A store whose household has one malformed tick row for `item`. */
      async function withBadTick(item: string) {
        const { store, dbFilename, v1DbName } = fresh(deps);
        const saved = await store.saveStep("housing", { housingType: "flat" });
        await store.setTick("candles", true, 2);
        await store.close();
        await inspect(dbFilename, (db) =>
          db.execute(
            `INSERT INTO local_household_ticks (id, household_id, item, selected, quantity, updated_at, field_ts)
             VALUES (?, ?, ?, 1, -5, ?, '{}')`,
            [`${TEST_ID}:${item}`, TEST_ID, item, TEST_TIME],
          ),
        );
        const again = createPowerSyncStore({ dbFilename, v1DbName, ...deps });
        opened.push(again);
        return { store: again, saved };
      }

      it("still loads the profile and the readable ticks", async () => {
        const { store, saved } = await withBadTick("drinking-water");
        expect(await store.load()).toEqual({
          kind: "found",
          household: saved,
          ticks: [{ item: "candles", selected: true, quantity: 2 }],
          emergencies: [],
          planCreatedAt: null,
          listCreatedAt: null,
        });
      });

      it("keeps the same household on the next step save", async () => {
        const { store, saved } = await withBadTick("drinking-water");
        const next = await store.saveStep("housing", { housingType: "house" });
        expect(next.id).toBe(saved.id);
        expect(next.housingType).toBe("house");
      });

      it("does not block ticking that item", async () => {
        const { store } = await withBadTick("drinking-water");
        await store.setTick("drinking-water", true, 4);
        expect(await ticks(store)).toEqual(
          expect.arrayContaining([{ item: "drinking-water", selected: true, quantity: 4 }]),
        );
      });
    });
  });

  describe("emergencies", () => {
    const emergencies = async (store: PowerSyncHouseholdStore) => {
      const loaded = await store.load();
      return loaded.kind === "found" ? loaded.emergencies : undefined;
    };

    it("sets the selection exactly, across a reopen", async () => {
      const { store, dbFilename, v1DbName } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await store.setEmergencies(["flood", "blackout"]);
      expect(await emergencies(store)).toEqual(expect.arrayContaining(["flood", "blackout"]));
      await store.setEmergencies(["blackout"]);
      expect(await emergencies(store)).toEqual(["blackout"]);
      await store.setEmergencies(["blackout", "flood"]);
      await store.close();

      const again = createPowerSyncStore({ dbFilename, v1DbName });
      opened.push(again);
      expect(await emergencies(again)).toHaveLength(2);
      expect(await emergencies(again)).toEqual(expect.arrayContaining(["flood", "blackout"]));
    });

    it("keeps the selection across a step save", async () => {
      const { store } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await store.setEmergencies(["flood"]);
      await store.saveStep("housing", { housingType: "house" });
      expect(await emergencies(store)).toEqual(["flood"]);
    });

    it("rejects without a household, and writes nothing", async () => {
      const { store, dbFilename } = fresh(deps);
      await expect(store.setEmergencies(["flood"])).rejects.toMatchObject({ code: "invalid" });
      await store.close();
      expect(await inspect(dbFilename, (db) => count(db, "local_household_emergencies"))).toBe(0);
    });

    it("rejects a bad id, and writes nothing", async () => {
      const { store } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await expect(store.setEmergencies(["flood", "Flood"])).rejects.toMatchObject({
        code: "invalid",
      });
      expect(await emergencies(store)).toEqual([]);
    });

    it("is removed by clear", async () => {
      const { store, dbFilename } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await store.setEmergencies(["flood"]);
      await store.clear();
      await store.close();
      expect(await inspect(dbFilename, (db) => count(db, "local_household_emergencies"))).toBe(0);
    });

    it("calls subscribers after a change", async () => {
      const { store } = fresh(deps);
      await store.saveStep("housing", { housingType: "flat" });
      await new Promise((resolve) => setTimeout(resolve, 200)); // let the save's event pass
      let calls = 0;
      store.subscribe(() => {
        calls += 1;
      });
      await store.setEmergencies(["flood"]);
      await expect.poll(() => calls).toBeGreaterThan(0);
    });

    describe("with an unreadable emergency row", () => {
      /** A store whose household has one malformed emergency row for `emergency`. */
      async function withBadEmergency(emergency: string) {
        const { store, dbFilename, v1DbName } = fresh(deps);
        const saved = await store.saveStep("housing", { housingType: "flat" });
        await store.setEmergencies(["blackout"]);
        await store.close();
        await inspect(dbFilename, (db) =>
          db.execute(
            `INSERT INTO local_household_emergencies (id, household_id, emergency, selected, updated_at, field_ts)
             VALUES (?, ?, ?, 7, ?, '{}')`,
            [`${TEST_ID}:${emergency}`, TEST_ID, emergency, TEST_TIME],
          ),
        );
        const again = createPowerSyncStore({ dbFilename, v1DbName, ...deps });
        opened.push(again);
        return { store: again, saved };
      }

      it("still loads the profile and the readable emergencies", async () => {
        const { store, saved } = await withBadEmergency("flood");
        expect(await store.load()).toEqual({
          kind: "found",
          household: saved,
          ticks: [],
          emergencies: ["blackout"],
          planCreatedAt: null,
          listCreatedAt: null,
        });
      });

      it("keeps the same household on the next step save", async () => {
        const { store, saved } = await withBadEmergency("flood");
        const next = await store.saveStep("housing", { housingType: "house" });
        expect(next.id).toBe(saved.id);
      });

      it("does not block choosing that emergency", async () => {
        const { store } = await withBadEmergency("flood");
        await store.setEmergencies(["blackout", "flood"]);
        expect(await emergencies(store)).toEqual(expect.arrayContaining(["blackout", "flood"]));
      });
    });
  });
});
