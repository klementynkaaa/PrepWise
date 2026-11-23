import { z } from "zod";
import { TABLE_COLUMNS, rowSchemas, type RowOf, type TableName } from "./rows";

/**
 * How the rows of `rows.ts` are kept in PowerSync's SQLite database: the
 * column types of the client schema, and the encoding both ways. Pure, so it
 * runs in unit tests without a database.
 *
 * SQLite has no booleans and no JSON type: booleans are stored as 0/1 and
 * `field_ts` as JSON text. Every row read back is decoded and then validated
 * with the `rows.ts` schemas at this boundary.
 */

export type SqliteType = "text" | "integer" | "real";
export type SqliteValue = string | number | null;
export type SqliteRow = Record<string, unknown>;

/** Columns stored as 0/1 that the row format treats as booleans. */
const BOOLEAN_COLUMNS: ReadonlySet<string> = new Set(["has_pets", "selected"]);
/** Columns stored as integers (booleans included). */
const INTEGER_COLUMNS: ReadonlySet<string> = new Set([
  ...BOOLEAN_COLUMNS,
  "adults",
  "seniors",
  "children",
  "small_children",
  "small_dog",
  "medium_dog",
  "large_dog",
  "cat",
  "other_small",
  "schema_version",
]);
/** Columns stored as floating point numbers (a quantity may be fractional). */
const REAL_COLUMNS: ReadonlySet<string> = new Set(["quantity"]);
/** Columns only the server fills; NULL on rows this device wrote. */
const SERVER_ONLY_COLUMNS: ReadonlySet<string> = new Set([
  "created_by",
  "created_at",
  "updated_by",
]);
/** Timestamp columns besides the values inside `field_ts`. */
const TIMESTAMP_COLUMNS: ReadonlySet<string> = new Set(["created_at", "updated_at"]);

/**
 * Client schema columns per table: every `rows.ts` column except `id`, which
 * PowerSync adds to each table itself.
 */
export const SQLITE_COLUMNS: { [T in TableName]: Record<string, SqliteType> } = {
  households: columnTypes("households"),
  household_needs: columnTypes("household_needs"),
  household_steps: columnTypes("household_steps"),
  household_ticks: columnTypes("household_ticks"),
  household_emergencies: columnTypes("household_emergencies"),
};

function columnTypes(table: TableName): Record<string, SqliteType> {
  return Object.fromEntries(
    TABLE_COLUMNS[table]
      .filter((column) => column !== "id")
      .map((column) => [column, sqliteType(column)]),
  );
}

function sqliteType(column: string): SqliteType {
  if (INTEGER_COLUMNS.has(column)) return "integer";
  if (REAL_COLUMNS.has(column)) return "real";
  return "text";
}

/**
 * Local-only twin of each synced table. While sync is off the store writes
 * only these, so nothing ever waits in the upload queue (decision record,
 * "Store branch"). S-10 copies them into the synced tables after sign-in.
 */
export const LOCAL_TABLES = {
  households: "local_households",
  household_needs: "local_household_needs",
  household_steps: "local_household_steps",
  household_ticks: "local_household_ticks",
  household_emergencies: "local_household_emergencies",
} as const satisfies Record<TableName, string>;

/**
 * Local-only table with one row (`DEVICE_ROW_ID`): the household this device
 * shows (`household_id`), when this device created its plan (`plan_created_at`)
 * and its shopping list (`list_created_at`). Rows written before a column
 * existed read it as NULL.
 */
export const DEVICE_TABLE = "device_state";
export const DEVICE_ROW_ID = "device";

const deviceTimestampSchema = z.iso.datetime({ offset: true }).nullable();

function decodeDeviceTimestamp(value: unknown): string | null {
  const parsed = deviceTimestampSchema.safeParse(
    typeof value === "string" ? normalizeTimestamp(value) : value,
  );
  return parsed.success ? parsed.data : null;
}

/**
 * The stored `plan_created_at`, validated at this boundary. An unreadable value
 * counts as not set: the flag only chooses between "show" and "create" the plan.
 */
export function decodePlanCreatedAt(value: unknown): string | null {
  return decodeDeviceTimestamp(value);
}

/**
 * The stored `list_created_at`, with the same rules as `decodePlanCreatedAt`:
 * an unreadable value counts as not set.
 */
export function decodeListCreatedAt(value: unknown): string | null {
  return decodeDeviceTimestamp(value);
}

const POSTGRES_TEXT = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/;
const SHORT_OFFSET = /(T\d{2}:\d{2}:\d{2}(?:\.\d+)?[+-]\d{2})$/;

/**
 * A timestamp as the server may send it, as strict ISO 8601. Postgres keeps
 * microseconds (`.123456`), which ISO allows as they are; its text form also
 * uses a space instead of `T` and an offset without minutes (`+00`). Anything
 * else is returned unchanged for the schema to judge.
 */
export function normalizeTimestamp(value: string): string {
  return value.replace(POSTGRES_TEXT, "$1T$2").replace(SHORT_OFFSET, "$1:00");
}

/** One column value as SQLite stores it. */
export function encodeValue(column: string, value: unknown): SqliteValue {
  if (value === undefined || value === null) return null;
  if (column === "field_ts") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" || typeof value === "number") return value;
  throw new TypeError(`Cannot store column ${column}`);
}

/** The columns and values to write for a whole row or a set of changed columns. */
export function encodeColumns(fields: Record<string, unknown>): {
  columns: string[];
  values: SqliteValue[];
} {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  return {
    columns: entries.map(([column]) => column),
    values: entries.map(([column, value]) => encodeValue(column, value)),
  };
}

function decodeFieldTs(value: unknown): unknown {
  if (typeof value !== "string") return value;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return value; // the schema rejects a string
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return parsed;
  return Object.fromEntries(
    Object.entries(parsed).map(([key, ts]) => [
      key,
      typeof ts === "string" ? normalizeTimestamp(ts) : ts,
    ]),
  );
}

function decodeValue(column: string, value: unknown): unknown {
  if (column === "field_ts") return decodeFieldTs(value);
  if (BOOLEAN_COLUMNS.has(column) && (value === 0 || value === 1)) return value === 1;
  if (TIMESTAMP_COLUMNS.has(column) && typeof value === "string") return normalizeTimestamp(value);
  return value;
}

/** Why a stored row could not be read. */
export class RowDecodeError extends Error {
  constructor(table: TableName, options?: { cause?: unknown }) {
    super(`Unreadable row in ${table}`, options);
    this.name = "RowDecodeError";
  }
}

/**
 * A row read from SQLite as a validated `rows.ts` row. Only the table's own
 * columns are read; server-only columns that are NULL are left out, because
 * the local data has none. Throws RowDecodeError when the row is not valid.
 */
export function decodeRow<T extends TableName>(table: T, raw: SqliteRow): RowOf<T> {
  const decoded: Record<string, unknown> = {};
  for (const column of TABLE_COLUMNS[table]) {
    const value = raw[column];
    if (value === null && SERVER_ONLY_COLUMNS.has(column)) continue;
    decoded[column] = decodeValue(column, value);
  }
  const parsed = rowSchemas[table].safeParse(decoded);
  if (!parsed.success) throw new RowDecodeError(table, { cause: parsed.error });
  return parsed.data;
}
