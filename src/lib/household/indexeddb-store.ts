import { householdSchema } from "./schema";
import { buildSavedRecord, defaultDeps, type SaveDeps } from "./save-step";
import { HouseholdStoreError, type HouseholdStore, type LoadResult } from "./store";

export const DB_NAME = "prepwise";
export const STORE_NAME = "household";
export const RECORD_KEY = "current";
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
    const result = await work(tx.objectStore(STORE_NAME));
    await finished;
    return result;
  } catch (error) {
    if (error instanceof HouseholdStoreError) throw error;
    throw new HouseholdStoreError("unavailable", { cause: error });
  } finally {
    db?.close();
  }
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
      const parsed = householdSchema.safeParse(raw);
      return parsed.success ? { kind: "found", household: parsed.data } : { kind: "invalid" };
    },

    async saveStep(step, patch) {
      const raw = await readRaw();
      const existing = raw === undefined ? null : householdSchema.safeParse(raw);
      // An invalid stored record is overwritten, starting from a blank profile.
      const current = existing?.success ? existing.data : null;
      const record = buildSavedRecord(current, step, patch, deps);
      await withStore(dbName, "readwrite", (store) =>
        requestToPromise(store.put(record, RECORD_KEY)),
      );
      return record;
    },

    async clear() {
      await withStore(dbName, "readwrite", (store) => requestToPromise(store.delete(RECORD_KEY)));
    },
  };
}
