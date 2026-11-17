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
    expect(await again.load()).toEqual({ kind: "found", household: done });
  });

  it("writes only the local-only tables, so nothing waits for upload", async () => {
    const { store, dbFilename } = fresh(deps);
    await store.saveStep("people", { people: one, hasPets: false });
    await store.saveStep("needs", { needs: ["specialDiet", "limitedMobility"] });
    await store.close();
    const counts = await inspect(dbFilename, async (db) => ({
      crud: await count(db, "ps_crud"),
      households: await count(db, "households"),
      localHouseholds: await count(db, "local_households"),
      localNeeds: await count(db, "local_household_needs"),
      localSteps: await count(db, "local_household_steps"),
    }));
    expect(counts).toEqual({
      crud: 0,
      households: 0,
      localHouseholds: 1,
      localNeeds: 2,
      localSteps: 2,
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
    expect(await store.load()).toEqual({ kind: "found", household: back });
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

      expect(await store.load()).toEqual({ kind: "found", household: completeHousehold() });
      expect(await idb(v1DbName, (s) => s.get(RECORD_KEY))).toBeUndefined();
      expect(await idb(v1DbName, (s) => s.get(BACKUP_KEY))).toBeUndefined();

      // Later saves build on the imported household, and a reopen does not import again.
      const saved = await store.saveStep("housing", { housingType: "house" });
      expect(saved).toMatchObject({ id: TEST_ID, housingType: "house", status: "complete" });
      await store.close();
      const again = createPowerSyncStore({ dbFilename, v1DbName });
      opened.push(again);
      expect(await again.load()).toEqual({ kind: "found", household: saved });
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
});
