import { afterEach, describe, expect, it, vi } from "vitest";
import { completeHouseholdV1 } from "./fixtures";
import { importV1 } from "./import-v1";
import {
  BACKUP_KEY,
  readV1Backup,
  readV1Record,
  RECORD_KEY,
  removeV1Backup,
  removeV1Record,
  STORE_NAME,
} from "./indexeddb-store";
import { migrateV1 } from "./contract";

let counter = 0;
const freshName = () => `household-test-${Date.now()}-${counter++}`;

function openRaw(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putRaw(name: string, value: unknown, key = RECORD_KEY): Promise<void> {
  const db = await openRaw(name);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("v1 record in IndexedDB", () => {
  it("reads nothing when no record was saved", async () => {
    expect(await readV1Record(freshName())).toBeUndefined();
  });

  it("reads the raw record", async () => {
    const name = freshName();
    await putRaw(name, completeHouseholdV1());
    expect(await readV1Record(name)).toEqual(completeHouseholdV1());
  });

  it("removes the record, keeping a backup when asked", async () => {
    const name = freshName();
    await putRaw(name, { broken: 1 });
    await removeV1Record(name, { backup: { broken: 1 } });
    expect(await readV1Record(name)).toBeUndefined();
    expect(await readV1Backup(name)).toEqual({ broken: 1 });
    await removeV1Backup(name);
    expect(await readV1Backup(name)).toBeUndefined();
  });

  it("removes the record without touching the backup when none is given", async () => {
    const name = freshName();
    await putRaw(name, "old", BACKUP_KEY);
    await putRaw(name, completeHouseholdV1());
    await removeV1Record(name);
    expect(await readV1Record(name)).toBeUndefined();
    expect(await readV1Backup(name)).toBe("old");
  });

  it("does not touch IndexedDB until a function is called", async () => {
    const open = vi.fn();
    vi.stubGlobal("indexedDB", { open });
    await import("./indexeddb-store");
    expect(open).not.toHaveBeenCalled();
  });

  it("rejects when IndexedDB is missing, blocked, failing or throwing", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(readV1Record(freshName())).rejects.toThrow();

    const failing = (fire: "onblocked" | "onerror") => ({
      open() {
        const request: Record<string, unknown> = { error: new Error("denied") };
        queueMicrotask(() => (request[fire] as (() => void) | undefined)?.());
        return request;
      },
    });
    for (const fire of ["onblocked", "onerror"] as const) {
      vi.stubGlobal("indexedDB", failing(fire));
      await expect(readV1Record(freshName())).rejects.toThrow();
    }

    vi.stubGlobal("indexedDB", {
      open() {
        throw new Error("SecurityError");
      },
    });
    await expect(readV1Record(freshName())).rejects.toThrow("SecurityError");
  });
});

describe("importV1", () => {
  it("does nothing when there is no v1 record", async () => {
    const write = vi.fn();
    expect(await importV1(write, freshName())).toBe("none");
    expect(write).not.toHaveBeenCalled();
  });

  it("writes a valid record's rows, then removes `current`", async () => {
    const name = freshName();
    await putRaw(name, completeHouseholdV1());
    const write = vi.fn(async () => {
      // The record is still there while the rows are written.
      expect(await readV1Record(name)).toEqual(completeHouseholdV1());
    });
    expect(await importV1(write, name)).toBe("imported");
    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith(migrateV1(completeHouseholdV1()));
    expect(await readV1Record(name)).toBeUndefined();
    expect(await readV1Backup(name)).toBeUndefined();
    expect(await importV1(write, name)).toBe("none");
    expect(write).toHaveBeenCalledOnce();
  });

  it("keeps `current` when writing the rows fails, so the next open tries again", async () => {
    const name = freshName();
    await putRaw(name, completeHouseholdV1());
    await expect(importV1(() => Promise.reject(new Error("disk")), name)).rejects.toThrow("disk");
    expect(await readV1Record(name)).toEqual(completeHouseholdV1());
  });

  it("keeps an invalid record under BACKUP_KEY, removes `current` and writes nothing", async () => {
    const name = freshName();
    const broken = { ...completeHouseholdV1(), schemaVersion: 2 };
    await putRaw(name, broken);
    const write = vi.fn();
    expect(await importV1(write, name)).toBe("invalid");
    expect(write).not.toHaveBeenCalled();
    expect(await readV1Backup(name)).toEqual(broken);
    expect(await readV1Record(name)).toBeUndefined();
  });

  it("is skipped when IndexedDB cannot be read", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const write = vi.fn();
    expect(await importV1(write, freshName())).toBe("skipped");
    expect(write).not.toHaveBeenCalled();
  });
});
