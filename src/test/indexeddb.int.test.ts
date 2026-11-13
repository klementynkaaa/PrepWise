import { describe, expect, it } from "vitest";

let counter = 0;
const freshName = () => `test-db-${Date.now()}-${counter++}`;

function open(name: string, version = 1): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("items")) {
        request.result.createObjectStore("items", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function get<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = db.transaction("items").objectStore("items").get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

describe("IndexedDB persistence", () => {
  it("reads a record back unchanged after closing and reopening", async () => {
    const name = freshName();
    const record = { id: "a", people: 3, tags: ["water", "food"], nested: { days: 3 } };

    const first = await open(name);
    const tx = first.transaction("items", "readwrite");
    tx.objectStore("items").put(record);
    await done(tx);
    first.close();

    const second = await open(name);
    expect(await get(second, "a")).toEqual(record);
    second.close();
  });

  it("uses an isolated database per name", async () => {
    const db = await open(freshName());
    expect(await get(db, "a")).toBeUndefined();
    db.close();
  });
});
