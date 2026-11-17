import { migrateV1, type HouseholdRows } from "./contract";
import { DB_NAME, readV1Record, removeV1Record } from "./indexeddb-store";
import { HouseholdStoreError } from "./store";

/** Writes an imported household and makes it the device's household, in one transaction. */
export type V1ImportWrite = (
  rows: HouseholdRows & { household: NonNullable<HouseholdRows["household"]> },
) => Promise<void>;

/**
 * What the import did: nothing to import, a valid record imported, an invalid
 * record set aside under BACKUP_KEY, or IndexedDB could not be read (the record,
 * if any, stays for the next open).
 */
export type V1ImportResult = "none" | "imported" | "invalid" | "skipped";

/**
 * Brings an S-01 household (IndexedDB `prepwise` / `household` / `current`)
 * into the new store, once:
 * 1. a valid record is written as rows (`migrateV1`) and becomes the device's
 *    household, then `current` is deleted;
 * 2. an invalid record is kept under BACKUP_KEY, `current` is deleted, and
 *    the store starts empty.
 * The rows are written before `current` is deleted, so a crash in between
 * imports the same rows again on the next open instead of losing them.
 * A failing `write` rejects, and `current` is kept.
 */
export async function importV1(
  write: V1ImportWrite,
  dbName: string = DB_NAME,
): Promise<V1ImportResult> {
  let raw: unknown;
  try {
    raw = await readV1Record(dbName);
  } catch {
    return "skipped";
  }
  if (raw === undefined) return "none";

  let rows: HouseholdRows;
  try {
    rows = migrateV1(raw);
  } catch (error) {
    if (!(error instanceof HouseholdStoreError)) throw error;
    await removeV1Record(dbName, { backup: raw });
    return "invalid";
  }
  const { household } = rows;
  if (!household) throw new HouseholdStoreError("invalid");
  await write({ ...rows, household });
  await removeV1Record(dbName);
  return "imported";
}
