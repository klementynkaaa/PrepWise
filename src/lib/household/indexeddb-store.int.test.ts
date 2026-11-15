import { afterEach, describe, expect, it, vi } from "vitest";
import { completeHousehold, TEST_ID, TEST_TIME } from "./fixtures";
import { BACKUP_KEY, createIndexedDbStore, RECORD_KEY, STORE_NAME } from "./indexeddb-store";
import { HouseholdStoreError } from "./store";

let counter = 0;
const freshName = () => `household-test-${Date.now()}-${counter++}`;
const deps = { newId: () => TEST_ID, now: () => new Date(TEST_TIME) };
const one = { adults: 1, seniors: 0, children: 0, smallChildren: 0 };

function openRaw(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getRaw(name: string, key: string): Promise<unknown> {
  const db = await openRaw(name);
  const value = await new Promise<unknown>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

async function putRaw(name: string, value: unknown): Promise<void> {
  const db = await openRaw(name);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, RECORD_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("IndexedDB household store", () => {
  it("returns none when nothing is saved", async () => {
    expect(await createIndexedDbStore({ dbName: freshName() }).load()).toEqual({ kind: "none" });
  });

  it("round-trips a record across a fresh store instance (close and reopen)", async () => {
    const dbName = freshName();
    const saved = await createIndexedDbStore({ dbName, ...deps }).saveStep("people", {
      people: one,
      hasPets: false,
    });
    const loaded = await createIndexedDbStore({ dbName }).load();
    expect(loaded).toEqual({ kind: "found", household: saved });
  });

  it("goes from draft to complete and keeps the id", async () => {
    const store = createIndexedDbStore({ dbName: freshName(), ...deps });
    const a = await store.saveStep("people", { people: one, hasPets: false });
    await store.saveStep("housing", { housingType: "flat" });
    const done = await store.saveStep("needs", { needs: ["specialDiet"] });
    expect(a.status).toBe("draft");
    expect(done.status).toBe("complete");
    expect(done.id).toBe(a.id);
  });

  it("rejects invalid data with a typed error and writes nothing", async () => {
    const store = createIndexedDbStore({ dbName: freshName(), ...deps });
    await expect(store.saveStep("housing", { housingType: "tent" as never })).rejects.toMatchObject(
      { code: "invalid" },
    );
    expect(await store.load()).toEqual({ kind: "none" });
  });

  it("reports an invalid stored record as invalid, without deleting it", async () => {
    const dbName = freshName();
    await putRaw(dbName, { id: "x", nonsense: true });
    const store = createIndexedDbStore({ dbName });
    expect(await store.load()).toEqual({ kind: "invalid" });
    expect(await store.load()).toEqual({ kind: "invalid" });
  });

  it("overwrites an invalid record on the next save, starting blank", async () => {
    const dbName = freshName();
    await putRaw(dbName, { broken: 1 });
    const store = createIndexedDbStore({ dbName, ...deps });
    const saved = await store.saveStep("housing", { housingType: "house" });
    expect(saved.people.adults).toBe(0);
    expect(await store.load()).toEqual({ kind: "found", household: saved });
  });

  it("keeps the unreadable record under a backup key before overwriting it, and clear removes it", async () => {
    const dbName = freshName();
    await putRaw(dbName, { broken: 1 });
    const store = createIndexedDbStore({ dbName, ...deps });
    await store.saveStep("housing", { housingType: "house" });
    expect(await getRaw(dbName, BACKUP_KEY)).toEqual({ broken: 1 });
    await store.clear();
    expect(await getRaw(dbName, BACKUP_KEY)).toBeUndefined();
  });

  it("loads a stored complete household", async () => {
    const dbName = freshName();
    await putRaw(dbName, completeHousehold());
    expect(await createIndexedDbStore({ dbName }).load()).toEqual({
      kind: "found",
      household: completeHousehold(),
    });
  });

  it("clears the record", async () => {
    const store = createIndexedDbStore({ dbName: freshName(), ...deps });
    await store.saveStep("housing", { housingType: "flat" });
    await store.clear();
    expect(await store.load()).toEqual({ kind: "none" });
  });

  it("does not touch IndexedDB until a method is called", () => {
    const open = vi.fn();
    vi.stubGlobal("indexedDB", { open });
    createIndexedDbStore({ dbName: freshName() });
    expect(open).not.toHaveBeenCalled();
  });

  it("is unavailable when IndexedDB is missing", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const store = createIndexedDbStore({ dbName: freshName() });
    expect(await store.load()).toEqual({ kind: "unavailable" });
    await expect(store.saveStep("housing", { housingType: "flat" })).rejects.toMatchObject({
      code: "unavailable",
    });
    await expect(store.clear()).rejects.toBeInstanceOf(HouseholdStoreError);
  });

  it("is unavailable when the database is blocked or fails to open", async () => {
    const failing = (fire: "onblocked" | "onerror") => ({
      open() {
        const request: Record<string, unknown> = { error: new Error("denied") };
        queueMicrotask(() => (request[fire] as (() => void) | undefined)?.());
        return request;
      },
    });
    for (const fire of ["onblocked", "onerror"] as const) {
      vi.stubGlobal("indexedDB", failing(fire));
      const store = createIndexedDbStore({ dbName: freshName() });
      expect(await store.load()).toEqual({ kind: "unavailable" });
    }
  });

  it("is unavailable when indexedDB.open throws", async () => {
    vi.stubGlobal("indexedDB", {
      open() {
        throw new Error("SecurityError");
      },
    });
    expect(await createIndexedDbStore({ dbName: freshName() }).load()).toEqual({
      kind: "unavailable",
    });
  });

  it("turns a quota error on write into an unavailable error", async () => {
    const dbName = freshName();
    const real = await openRaw(dbName);
    real.close();
    const originalOpen = indexedDB.open.bind(indexedDB);
    vi.stubGlobal("indexedDB", {
      open: (name: string, version?: number) => {
        const request = originalOpen(name, version);
        request.addEventListener("success", () => {
          const db = request.result;
          const tx = db.transaction.bind(db);
          db.transaction = ((...args: Parameters<typeof tx>) => {
            const t = tx(...args);
            if (args[1] === "readwrite") {
              const store = t.objectStore.bind(t);
              t.objectStore = ((n: string) => {
                const s = store(n);
                s.put = () => {
                  throw new DOMException("full", "QuotaExceededError");
                };
                return s;
              }) as typeof t.objectStore;
            }
            return t;
          }) as typeof db.transaction;
        });
        return request;
      },
    });
    const store = createIndexedDbStore({ dbName, ...deps });
    await expect(store.saveStep("housing", { housingType: "flat" })).rejects.toMatchObject({
      code: "unavailable",
    });
  });
});
