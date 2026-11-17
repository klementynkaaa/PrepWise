import { column, Schema, Table } from "@powersync/web";
import { TABLES, type TableName } from "./rows";
import { DEVICE_TABLE, LOCAL_TABLES, SQLITE_COLUMNS } from "./powersync-codec";

/**
 * PowerSync client schema, mirroring `rows.ts`. Loaded only through a dynamic
 * import from the store, so pages and unit tests never evaluate `@powersync/web`.
 *
 * - The synced tables are declared now and stay empty until S-10 turns sync on.
 * - Their local-only twins hold the household while sync is off, so nothing
 *   queues for upload (decision record, "Store branch").
 * - `device_state` (local-only) holds the household this device shows.
 */
function columns(table: TableName) {
  return Object.fromEntries(
    Object.entries(SQLITE_COLUMNS[table]).map(([name, type]) => [
      name,
      type === "integer" ? column.integer : column.text,
    ]),
  );
}

const byHousehold = (table: TableName) =>
  table === "households" ? {} : { indexes: { household: ["household_id"] } };

export const householdSchema = new Schema({
  ...Object.fromEntries(
    TABLES.map((table) => [table, new Table(columns(table), byHousehold(table))]),
  ),
  ...Object.fromEntries(
    TABLES.map((table) => [
      LOCAL_TABLES[table],
      new Table(columns(table), { ...byHousehold(table), localOnly: true }),
    ]),
  ),
  [DEVICE_TABLE]: new Table({ household_id: column.text }, { localOnly: true }),
});
