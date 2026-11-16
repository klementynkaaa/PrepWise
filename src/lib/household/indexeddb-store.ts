import { fromV1 } from "./contract";
import { householdV1Schema } from "./schema";
import { buildSavedRecord, defaultDeps, type SaveDeps } from "./save-step";
import { HouseholdStoreError, type HouseholdStore, type LoadResult } from "./store";
import type { Household, HouseholdV1 } from "./types";

export const DB_NAME = "prepwise";
export const STORE_NAME = "household";
export const RECORD_KEY = "current";
/** Where an unreadable record is kept when a save replaces it, so it can be recovered. */
export const BACKUP_KEY = "previous-invalid";
const DB_VERSION = 1;

export type IndexedDbStoreOptions = Partial<SaveDeps> & { dbName?: string };

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(name, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB is blocked"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Runs `work` on the household store inside one transaction, then closes the
 * database. Any storage failure (missing, blocked, quota) becomes "unavailable".
 */
async function withStore<T>(
  dbName: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  let db: IDBDatabase | undefined;
  try {
    db = await openDatabase(dbName);
    const tx = db.transaction(STORE_NAME, mode);
    const finished = transactionDone(tx);
    // Promise.all gives `finished` a handler right away, so a transaction that aborts
    // while `work` is still running cannot raise an unhandled rejection.
    const [result] = await Promise.all([work(tx.objectStore(STORE_NAME)), finished]);
    return result;
  } catch (error) {
    if (error instanceof HouseholdStoreError) throw error;
    throw new HouseholdStoreError("unavailable", { cause: error });
  } finally {
    db?.close();
  }
}

/**
 * Until the store moves to the shared rows (S-09 Phase 5), the record stays in
 * the S-01 format (schema version 1), so the one-time v1 import can read it.
 * The name is not kept: nothing sets it yet.
 */
function toV1(household: Household): HouseholdV1 {
  const { id, updatedAt, status, completedSteps, people, hasPets, pets, housingType, needs } =
    household;
  return {
    id,
    schemaVersion: 1,
    updatedAt,
    status,
    completedSteps,
    people,
    hasPets,
    pets,
    housingType,
    needs,
  };
}

function readV1(raw: unknown) {
  const parsed = householdV1Schema.safeParse(raw);
  return parsed.success ? { success: true as const, data: fromV1(parsed.data) } : parsed;
}

/**
 * IndexedDB-backed store: database `prepwise`, object store `household`, one
 * record under the key `current`. Nothing touches IndexedDB until a method is
 * called, so importing this module is safe during prerendering.
 */
export function createIndexedDbStore(options: IndexedDbStoreOptions = {}): HouseholdStore {
  const { dbName = DB_NAME, ...rest } = options;
  const deps: SaveDeps = { ...defaultDeps, ...rest };

  async function readRaw(): Promise<unknown> {
    return withStore(dbName, "readonly", (store) => requestToPromise(store.get(RECORD_KEY)));
  }

  return {
    async load(): Promise<LoadResult> {
      let raw: unknown;
      try {
        raw = await readRaw();
      } catch {
        return { kind: "unavailable" };
      }
      if (raw === undefined) return { kind: "none" };
      const parsed = readV1(raw);
      return parsed.success ? { kind: "found", household: parsed.data } : { kind: "invalid" };
    },

    async saveStep(step, patch) {
      // Read, merge and write in ONE readwrite transaction, so two saves cannot
      // start from the same base record and drop each other's answers.
      return withStore(dbName, "readwrite", async (store) => {
        const raw = await requestToPromise(store.get(RECORD_KEY));
        const existing = raw === undefined ? null : readV1(raw);
        // An invalid stored record is replaced by a blank profile, but its raw value is
        // kept under BACKUP_KEY first, so nothing unreadable is lost silently. Any
        // future schemaVersion bump needs a migration before this point.
        const current = existing?.success ? existing.data : null;
        if (existing && !existing.success) await requestToPromise(store.put(raw, BACKUP_KEY));
        const record = buildSavedRecord(current, step, patch, deps);
        await requestToPromise(store.put(toV1(record), RECORD_KEY));
        return record;
      });
    },

    async clear() {
      await withStore(dbName, "readwrite", async (store) => {
        await requestToPromise(store.delete(RECORD_KEY));
        await requestToPromise(store.delete(BACKUP_KEY));
      });
    },
  };
}
