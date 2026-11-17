/**
 * The S-01 household record in IndexedDB (database `prepwise`, object store
 * `household`, key `current`, schema version 1). Only the one-time v1 import
 * (`import-v1.ts`) reads it; the household itself now lives in PowerSync's
 * local database. Nothing touches IndexedDB until a function is called, so
 * importing this module is safe during prerendering.
 */

export const DB_NAME = "prepwise";
export const STORE_NAME = "household";
export const RECORD_KEY = "current";
/** Where an unreadable v1 record is kept, so it can be recovered. */
export const BACKUP_KEY = "previous-invalid";
const DB_VERSION = 1;

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

/** Runs `work` on the household object store inside one transaction, then closes the database. */
async function withStore<T>(
  dbName: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDatabase(dbName);
  try {
    const tx = db.transaction(STORE_NAME, mode);
    const finished = transactionDone(tx);
    // Promise.all gives `finished` a handler right away, so a transaction that aborts
    // while `work` is still running cannot raise an unhandled rejection.
    const [result] = await Promise.all([work(tx.objectStore(STORE_NAME)), finished]);
    return result;
  } finally {
    db.close();
  }
}

/** The raw v1 record, or undefined when there is none. Rejects when IndexedDB fails. */
export function readV1Record(dbName: string = DB_NAME): Promise<unknown> {
  return withStore(dbName, "readonly", (store) => requestToPromise(store.get(RECORD_KEY)));
}

/**
 * Removes the v1 record once it is imported. With `backup`, its raw value is
 * kept under BACKUP_KEY first, in the same transaction.
 */
export function removeV1Record(
  dbName: string = DB_NAME,
  options: { backup?: unknown } = {},
): Promise<void> {
  return withStore(dbName, "readwrite", async (store) => {
    if ("backup" in options) await requestToPromise(store.put(options.backup, BACKUP_KEY));
    await requestToPromise(store.delete(RECORD_KEY));
  });
}

/** Removes a kept backup of an unreadable v1 record. */
export function removeV1Backup(dbName: string = DB_NAME): Promise<void> {
  return withStore(dbName, "readwrite", async (store) => {
    await requestToPromise(store.delete(BACKUP_KEY));
  });
}

/** The raw value kept under BACKUP_KEY, or undefined. */
export function readV1Backup(dbName: string = DB_NAME): Promise<unknown> {
  return withStore(dbName, "readonly", (store) => requestToPromise(store.get(BACKUP_KEY)));
}
