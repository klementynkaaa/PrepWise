import type { LockContext, PowerSyncDatabase } from "@powersync/web";
import {
  applyChanges,
  assemble,
  newHousehold,
  stepChanges,
  type HouseholdRows,
  type RowChange,
} from "./contract";
import { DB_NAME, removeV1Backup } from "./indexeddb-store";
import { importV1, type V1ImportWrite } from "./import-v1";
import {
  decodeRow,
  DEVICE_ROW_ID,
  DEVICE_TABLE,
  encodeColumns,
  LOCAL_TABLES,
  type SqliteRow,
} from "./powersync-codec";
import { TABLES } from "./rows";
import { defaultDeps, type SaveDeps } from "./save-step";
import { HouseholdStoreError, type HouseholdStore, type LoadResult } from "./store";
import type { Household } from "./types";

/** Database file in the origin private file system. */
export const POWERSYNC_DB_FILENAME = "prepwise-household.db";
/** PowerSync's worker, copied into `public/` before every build (`copy-assets`). */
export const POWERSYNC_WORKER = "/@powersync/worker.js";

export type PowerSyncStoreOptions = Partial<SaveDeps> & {
  /** Database file name; tests give each store its own. */
  dbFilename?: string;
  /** IndexedDB database the v1 import reads. */
  v1DbName?: string;
};

export type PowerSyncHouseholdStore = HouseholdStore & {
  /** Closes the database (tests). The store opens it again on the next call. */
  close(): Promise<void>;
};

const WATCHED_TABLES = [...TABLES.map((table) => LOCAL_TABLES[table]), DEVICE_TABLE];
const EMPTY: HouseholdRows = { household: null, needs: [], steps: [] };

type Read = { kind: "none" } | { kind: "found"; rows: HouseholdRows } | { kind: "invalid" };

/** The id of the household this device shows, or null. */
async function deviceHouseholdId(ctx: LockContext): Promise<string | null> {
  const row = await ctx.getOptional<{ household_id: unknown }>(
    `SELECT household_id FROM ${DEVICE_TABLE} WHERE id = ?`,
    [DEVICE_ROW_ID],
  );
  return typeof row?.household_id === "string" ? row.household_id : null;
}

/** The device's household rows, each validated at this boundary. */
async function readRows(ctx: LockContext): Promise<Read> {
  const id = await deviceHouseholdId(ctx);
  if (!id) return { kind: "none" };
  // One query at a time: they share the lock's connection.
  const households = await ctx.getAll<SqliteRow>(
    `SELECT * FROM ${LOCAL_TABLES.households} WHERE id = ?`,
    [id],
  );
  const needs = await ctx.getAll<SqliteRow>(
    `SELECT * FROM ${LOCAL_TABLES.household_needs} WHERE household_id = ?`,
    [id],
  );
  const steps = await ctx.getAll<SqliteRow>(
    `SELECT * FROM ${LOCAL_TABLES.household_steps} WHERE household_id = ?`,
    [id],
  );
  if (households.length !== 1) return { kind: "invalid" };
  try {
    return {
      kind: "found",
      rows: {
        household: decodeRow("households", households[0]),
        needs: needs.map((row) => decodeRow("household_needs", row)),
        steps: steps.map((row) => decodeRow("household_steps", row)),
      },
    };
  } catch {
    return { kind: "invalid" };
  }
}

/**
 * Writes row changes to the local-only tables. Tables are views, so there is
 * no upsert: an insert is a plain INSERT and a patch an UPDATE of its columns,
 * with `field_ts` merged per column (taken from `next`, where it already is).
 */
async function writeChanges(tx: LockContext, changes: readonly RowChange[], next: HouseholdRows) {
  for (const change of changes) {
    const table = LOCAL_TABLES[change.table];
    if (change.op === "insert") {
      const { columns, values } = encodeColumns(change.fields);
      await tx.execute(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
        values,
      );
      continue;
    }
    const merged = [next.household, ...next.needs, ...next.steps].find((r) => r?.id === change.id);
    const { columns, values } = encodeColumns({ ...change.fields, field_ts: merged?.field_ts });
    await tx.execute(
      `UPDATE ${table} SET ${columns.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`,
      [...values, change.id],
    );
  }
}

/** Makes `householdId` the household this device shows. */
async function setDeviceHousehold(tx: LockContext, householdId: string) {
  await tx.execute(`DELETE FROM ${DEVICE_TABLE}`);
  await tx.execute(`INSERT INTO ${DEVICE_TABLE} (id, household_id) VALUES (?, ?)`, [
    DEVICE_ROW_ID,
    householdId,
  ]);
}

/** Replaces any rows of the imported household and makes it the device's household. */
function importWriter(db: PowerSyncDatabase): V1ImportWrite {
  return (rows) =>
    db.writeTransaction(async (tx) => {
      const id = rows.household.id;
      await tx.execute(`DELETE FROM ${LOCAL_TABLES.households} WHERE id = ?`, [id]);
      for (const table of ["household_needs", "household_steps"] as const) {
        await tx.execute(`DELETE FROM ${LOCAL_TABLES[table]} WHERE household_id = ?`, [id]);
      }
      const changes: RowChange[] = [
        { table: "households", id, op: "insert", fields: rows.household },
        ...rows.needs.map((fields): RowChange => ({
          table: "household_needs",
          id: fields.id,
          op: "insert",
          fields,
        })),
        ...rows.steps.map((fields): RowChange => ({
          table: "household_steps",
          id: fields.id,
          op: "insert",
          fields,
        })),
      ];
      await writeChanges(tx, changes, rows);
      await setDeviceHousehold(tx, id);
    });
}

function toStoreError(error: unknown): HouseholdStoreError {
  return error instanceof HouseholdStoreError
    ? error
    : new HouseholdStoreError("unavailable", { cause: error });
}

/**
 * The household store on PowerSync's local SQLite database (S-09), with no
 * connection to any server. It holds the one household this device shows.
 *
 * - The database opens on the first call, never at import or creation, so
 *   prerendering is safe; `@powersync/web` itself is loaded then.
 * - Storage is `OPFSCoopSyncVFS`, set explicitly (decision record, "Storage
 *   (VFS)"). Where the database cannot open (a private Safari window has no
 *   origin private file system), `load()` reports `unavailable` and saves
 *   reject with `unavailable`, as screens already handle. The next call tries again.
 * - On open, an S-01 household is imported once (`import-v1.ts`).
 * - `subscribe` fires after any change to the household tables.
 */
export function createPowerSyncStore(options: PowerSyncStoreOptions = {}): PowerSyncHouseholdStore {
  const { dbFilename = POWERSYNC_DB_FILENAME, v1DbName = DB_NAME, ...rest } = options;
  const deps: SaveDeps = { ...defaultDeps, ...rest };
  const listeners = new Set<() => void>();
  let opening: Promise<PowerSyncDatabase> | null = null;

  async function openDatabase(): Promise<PowerSyncDatabase> {
    const [{ PowerSyncDatabase, WASQLiteVFS }, { householdSchema }] = await Promise.all([
      import("@powersync/web"),
      import("./powersync-schema"),
    ]);
    const db = new PowerSyncDatabase({
      schema: householdSchema,
      database: {
        dbFilename,
        vfs: WASQLiteVFS.OPFSCoopSyncVFS,
        worker: POWERSYNC_WORKER,
      },
      sync: { worker: POWERSYNC_WORKER },
    });
    try {
      await db.init();
    } catch (error) {
      void db.close().catch(() => {});
      throw error;
    }
    // A failed import keeps the v1 record, so the next open tries again.
    await importV1(importWriter(db), v1DbName).catch(() => undefined);
    db.onChange(
      { onChange: () => listeners.forEach((listener) => listener()) },
      { tables: WATCHED_TABLES },
    );
    return db;
  }

  function database(): Promise<PowerSyncDatabase> {
    if (!opening) {
      opening = openDatabase().catch((error: unknown) => {
        opening = null;
        throw error;
      });
    }
    return opening;
  }

  return {
    async load(): Promise<LoadResult> {
      let read: Read;
      try {
        const db = await database();
        read = await db.readLock(readRows);
      } catch {
        return { kind: "unavailable" };
      }
      if (read.kind !== "found") return read;
      const household = assemble(read.rows);
      return household ? { kind: "found", household } : { kind: "invalid" };
    },

    async saveStep(step, patch): Promise<Household> {
      try {
        const db = await database();
        // Read and write in ONE write transaction, so two saves cannot start from
        // the same rows and drop each other's answers.
        return await db.writeTransaction(async (tx) => {
          const read = await readRows(tx);
          const now = deps.now();
          // No household yet, or unreadable rows: start a new one. Unreadable rows
          // stay in the database, so nothing is lost silently.
          const created = read.kind === "found" ? [] : newHousehold(deps.newId(), now);
          const current = read.kind === "found" ? read.rows : applyChanges(EMPTY, created);
          const changes = [...created, ...stepChanges(current, step, patch, now)];
          const next = applyChanges(current, changes.slice(created.length));
          await writeChanges(tx, changes, next);
          if (created.length > 0 && next.household) await setDeviceHousehold(tx, next.household.id);
          const household = assemble(next);
          if (!household) throw new HouseholdStoreError("invalid");
          return household;
        });
      } catch (error) {
        throw toStoreError(error);
      }
    },

    async clear() {
      try {
        const db = await database();
        await db.writeTransaction(async (tx) => {
          for (const table of [...TABLES.map((t) => LOCAL_TABLES[t]), DEVICE_TABLE]) {
            await tx.execute(`DELETE FROM ${table}`);
          }
        });
        await removeV1Backup(v1DbName).catch(() => undefined);
      } catch (error) {
        throw toStoreError(error);
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async close() {
      const pending = opening;
      opening = null;
      if (!pending) return;
      const db = await pending.catch(() => null);
      await db?.close();
    },
  };
}
