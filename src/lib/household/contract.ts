import {
  setRowId,
  HOUSEHOLD_EMERGENCY_FIELDS,
  HOUSEHOLD_FIELDS,
  HOUSEHOLD_NEED_FIELDS,
  HOUSEHOLD_STEP_FIELDS,
  HOUSEHOLD_TICK_FIELDS,
  ROW_SCHEMA_VERSION,
  rowSchemas,
  type FieldTs,
  type HouseholdEmergencyRow,
  type HouseholdField,
  type HouseholdNeedRow,
  type HouseholdRow,
  type HouseholdStepRow,
  type HouseholdTickRow,
  type RowOf,
  type TableName,
} from "./rows";
import { householdV1Schema, stepPatchSchemas } from "./schema";
import { applyStep, computeStatus, EMPTY_PETS, emptyAnswers, stepsFor } from "./steps";
import { HouseholdStoreError } from "./store";
import {
  NEEDS,
  SCHEMA_VERSION,
  type Household,
  type HouseholdAnswers,
  type HouseholdV1,
  type PeopleGroup,
  type PetKind,
  type Step,
  type StepPatches,
  type Tick,
} from "./types";

/** The rows of one household, grouped by table. */
export type HouseholdRows = {
  household: HouseholdRow | null;
  needs: HouseholdNeedRow[];
  steps: HouseholdStepRow[];
  /** Ticked (and unticked) shopping-list items. Not part of `Household`. */
  ticks: HouseholdTickRow[];
  /** Emergencies added to the plan. Not part of `Household`. */
  emergencies: HouseholdEmergencyRow[];
};

/** The changed columns of a row, with `updated_at` and the `field_ts` of exactly those columns. */
export type RowPatch<T extends TableName> = Partial<
  Omit<RowOf<T>, "id" | "household_id" | "updated_at" | "field_ts">
> &
  Pick<RowOf<T>, "updated_at" | "field_ts">;

/** One write to one row: a whole new row, or only its changed columns. */
export type RowChange = {
  [T in TableName]:
    | { table: T; id: string; op: "insert"; fields: RowOf<T> }
    | { table: T; id: string; op: "patch"; fields: RowPatch<T> };
}[TableName];

type HouseholdValues = Pick<HouseholdRow, HouseholdField>;

const PEOPLE_COLUMNS = {
  adults: "adults",
  seniors: "seniors",
  children: "children",
  smallChildren: "small_children",
} as const satisfies Record<PeopleGroup, HouseholdField>;

const PET_COLUMNS = {
  smallDog: "small_dog",
  mediumDog: "medium_dog",
  largeDog: "large_dog",
  cat: "cat",
  otherSmall: "other_small",
} as const satisfies Record<PetKind, HouseholdField>;

/** `field_ts` naming each column, all at the same time. */
function stamp(columns: readonly string[], at: string): FieldTs {
  return Object.fromEntries(columns.map((column) => [column, at]));
}

/** The latest of some ISO timestamps, as UTC ISO (the server may send offsets). */
function latest(timestamps: readonly string[]): string {
  return new Date(Math.max(...timestamps.map((t) => Date.parse(t)))).toISOString();
}

/** The flat column values of a household's answers. */
function flatten(name: string | null, answers: HouseholdAnswers): HouseholdValues {
  const { people, pets } = answers;
  return {
    name,
    adults: people.adults,
    seniors: people.seniors,
    children: people.children,
    small_children: people.smallChildren,
    has_pets: answers.hasPets,
    small_dog: pets.smallDog,
    medium_dog: pets.mediumDog,
    large_dog: pets.largeDog,
    cat: pets.cat,
    other_small: pets.otherSmall,
    housing_type: answers.housingType,
    schema_version: ROW_SCHEMA_VERSION,
  };
}

function householdRow(id: string, values: HouseholdValues, at: string): HouseholdRow {
  return {
    id,
    household_id: id,
    ...values,
    updated_at: at,
    field_ts: stamp(HOUSEHOLD_FIELDS, at),
  };
}

function needRow(householdId: string, need: HouseholdNeedRow["need"], at: string) {
  return {
    id: setRowId(householdId, need),
    household_id: householdId,
    need,
    selected: true,
    updated_at: at,
    field_ts: stamp(HOUSEHOLD_NEED_FIELDS, at),
  } satisfies HouseholdNeedRow;
}

function stepRow(householdId: string, step: Step, at: string) {
  return {
    id: setRowId(householdId, step),
    household_id: householdId,
    step,
    selected: true,
    updated_at: at,
    field_ts: stamp(HOUSEHOLD_STEP_FIELDS, at),
  } satisfies HouseholdStepRow;
}

/**
 * Builds the `Household` screens use from its rows, and normalises the rules
 * that span fields (a merge of two devices' edits can break them):
 * - set rows with `selected: false` are ignored;
 * - `needs` and `completedSteps` come out in the `NEEDS` and `STEPS` order;
 * - without pets, pet counts read as 0 and the pets step is ignored;
 * - `status` is computed, never stored;
 * - `updatedAt` is the latest `updated_at` among the household's rows.
 * Returns null when there is no household row.
 */
export function assemble(rows: HouseholdRows): Household | null {
  const row = rows.household;
  if (!row) return null;
  const needRows = rows.needs.filter((r) => r.household_id === row.id);
  const stepRows = rows.steps.filter((r) => r.household_id === row.id);
  const hasPets = row.has_pets;

  const answers: HouseholdAnswers = {
    completedSteps: stepsFor({ hasPets }).filter((step) =>
      stepRows.some((r) => r.step === step && r.selected),
    ),
    people: {
      adults: row.adults,
      seniors: row.seniors,
      children: row.children,
      smallChildren: row.small_children,
    },
    hasPets,
    pets: hasPets
      ? {
          smallDog: row.small_dog,
          mediumDog: row.medium_dog,
          largeDog: row.large_dog,
          cat: row.cat,
          otherSmall: row.other_small,
        }
      : { ...EMPTY_PETS },
    housingType: row.housing_type,
    needs: NEEDS.filter((need) => needRows.some((r) => r.need === need && r.selected)),
  };

  return {
    ...answers,
    id: row.id,
    name: row.name,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: latest([row, ...needRows, ...stepRows].map((r) => r.updated_at)),
    status: computeStatus(answers),
  };
}

/** The insert that creates a new, blank household. */
export function newHousehold(id: string, now: Date): RowChange[] {
  const fields = householdRow(id, flatten(null, emptyAnswers()), now.toISOString());
  return [{ table: "households", id, op: "insert", fields }];
}

/** Household columns a step may change. Turning pets off also clears the pet counts. */
function stepColumns(step: Step, next: HouseholdAnswers): HouseholdField[] {
  switch (step) {
    case "people":
      return [
        ...Object.values(PEOPLE_COLUMNS),
        "has_pets",
        ...(next.hasPets ? [] : Object.values(PET_COLUMNS)),
      ];
    case "pets":
      return Object.values(PET_COLUMNS);
    case "housing":
      return ["housing_type"];
    case "needs":
      return [];
  }
}

type Toggle<E> = { element: E; id: string; op: "insert" | "patch"; selected: boolean };

/**
 * Set elements to write: an insert for a new element, a `selected` patch for an
 * existing row whose state changes, nothing otherwise.
 */
function toggles<E extends string>(
  existing: readonly { id: string; selected: boolean }[],
  householdId: string,
  elements: readonly E[],
  wanted: (element: E) => boolean,
): Toggle<E>[] {
  return elements.flatMap((element): Toggle<E>[] => {
    const id = setRowId(householdId, element);
    const selected = wanted(element);
    const row = existing.find((r) => r.id === id);
    if (!row) return selected ? [{ element, id, op: "insert", selected }] : [];
    return row.selected === selected ? [] : [{ element, id, op: "patch", selected }];
  });
}

/**
 * The smallest set of row changes that saves one step: only changed columns
 * and changed set elements, each with `field_ts` for exactly those columns,
 * set to `now`. Removing a need is a `selected: false` patch. An unchanged save
 * gives no changes. The household must exist (see `newHousehold`).
 * Throws HouseholdStoreError("invalid") on a bad patch or a missing household.
 */
export function stepChanges<S extends Step>(
  current: HouseholdRows,
  step: S,
  patch: StepPatches[S],
  now: Date,
): RowChange[] {
  const before = assemble(current);
  const row = current.household;
  if (!before || !row) throw new HouseholdStoreError("invalid");
  const parsed = stepPatchSchemas[step].safeParse(patch);
  if (!parsed.success) throw new HouseholdStoreError("invalid", { cause: parsed.error });

  const at = now.toISOString();
  const next = applyStep(before, step, parsed.data as StepPatches[S]);
  const changes: RowChange[] = [];

  const values = flatten(row.name, next);
  const changed = stepColumns(step, next).filter((column) => values[column] !== row[column]);
  if (changed.length > 0) {
    const fields: RowPatch<"households"> = {
      ...(Object.fromEntries(changed.map((c) => [c, values[c]])) as Partial<HouseholdValues>),
      updated_at: at,
      field_ts: stamp(changed, at),
    };
    changes.push({ table: "households", id: row.id, op: "patch", fields });
  }

  if (step === "needs") {
    for (const t of toggles(current.needs, row.id, NEEDS, (n) => next.needs.includes(n))) {
      changes.push(
        t.op === "insert"
          ? {
              table: "household_needs",
              id: t.id,
              op: "insert",
              fields: needRow(row.id, t.element, at),
            }
          : {
              table: "household_needs",
              id: t.id,
              op: "patch",
              fields: { selected: t.selected, updated_at: at, field_ts: stamp(["selected"], at) },
            },
      );
    }
  }

  // The saved step becomes done; saving "no pets" also un-confirms the pets step.
  const steps: Step[] = step === "people" && !next.hasPets ? ["people", "pets"] : [step];
  for (const t of toggles(current.steps, row.id, steps, (s) => next.completedSteps.includes(s))) {
    changes.push(
      t.op === "insert"
        ? {
            table: "household_steps",
            id: t.id,
            op: "insert",
            fields: stepRow(row.id, t.element, at),
          }
        : {
            table: "household_steps",
            id: t.id,
            op: "patch",
            fields: { selected: t.selected, updated_at: at, field_ts: stamp(["selected"], at) },
          },
    );
  }

  return changes;
}

/**
 * The row change for ticking (`ticked: true`) or unticking one shopping-list
 * item, with `field_ts` for exactly the changed columns, set to `now`:
 * - no row yet: ticking inserts one, unticking writes nothing;
 * - an existing row: a patch of `selected`, and of `quantity` when ticking
 *   with another quantity (unticking keeps the stored quantity);
 * - nothing differs: no change.
 * Throws HouseholdStoreError("invalid") without a household, or when the item
 * id or the quantity (when ticking) is not valid.
 */
export function tickChanges(
  rows: HouseholdRows,
  itemId: string,
  ticked: boolean,
  quantity: number,
  now: Date,
): RowChange[] {
  const household = rows.household;
  if (!household) throw new HouseholdStoreError("invalid");
  const at = now.toISOString();
  const id = setRowId(household.id, itemId);
  const row = rows.ticks.find((r) => r.id === id);

  if (!row) {
    if (!ticked) return [];
    const parsed = rowSchemas.household_ticks.safeParse({
      id,
      household_id: household.id,
      item: itemId,
      selected: true,
      quantity,
      updated_at: at,
      field_ts: stamp(HOUSEHOLD_TICK_FIELDS, at),
    });
    if (!parsed.success) throw new HouseholdStoreError("invalid", { cause: parsed.error });
    return [{ table: "household_ticks", id, op: "insert", fields: parsed.data }];
  }

  if (ticked && !rowSchemas.household_ticks.safeParse({ ...row, quantity }).success) {
    throw new HouseholdStoreError("invalid");
  }
  const changed: Partial<Pick<HouseholdTickRow, "selected" | "quantity">> = {};
  if (row.selected !== ticked) changed.selected = ticked;
  if (ticked && row.quantity !== quantity) changed.quantity = quantity;
  const columns = Object.keys(changed);
  if (columns.length === 0) return [];
  return [
    {
      table: "household_ticks",
      id,
      op: "patch",
      fields: { ...changed, updated_at: at, field_ts: stamp(columns, at) },
    },
  ];
}

/** The household's ticks as screens read them: rows of other households are left out. */
export function ticksOf(rows: HouseholdRows): Tick[] {
  const householdId = rows.household?.id;
  return rows.ticks
    .filter((r) => r.household_id === householdId)
    .map((r) => ({ item: r.item, selected: r.selected, quantity: r.quantity }));
}

/**
 * The row changes that make the selected emergencies exactly `ids`, with
 * `field_ts` for exactly the changed columns, set to `now`:
 * - an id with no row yet: an insert;
 * - an existing row whose `selected` differs: a patch of `selected`
 *   (re-selecting and deselecting both keep the row);
 * - nothing differs: no change.
 * Duplicate ids count once. Throws HouseholdStoreError("invalid") without a
 * household or when an id is not a valid emergency id.
 */
export function emergencyChanges(
  rows: HouseholdRows,
  householdId: string,
  ids: readonly string[],
  now: Date,
): RowChange[] {
  const household = rows.household;
  if (!household || household.id !== householdId) throw new HouseholdStoreError("invalid");
  const at = now.toISOString();
  const wanted = new Set(ids);
  const changes: RowChange[] = [];

  for (const emergency of wanted) {
    const id = setRowId(household.id, emergency);
    if (rows.emergencies.some((r) => r.id === id)) continue;
    const parsed = rowSchemas.household_emergencies.safeParse({
      id,
      household_id: household.id,
      emergency,
      selected: true,
      updated_at: at,
      field_ts: stamp(HOUSEHOLD_EMERGENCY_FIELDS, at),
    });
    if (!parsed.success) throw new HouseholdStoreError("invalid", { cause: parsed.error });
    changes.push({ table: "household_emergencies", id, op: "insert", fields: parsed.data });
  }

  for (const row of rows.emergencies) {
    if (row.household_id !== household.id) continue;
    const selected = wanted.has(row.emergency);
    if (row.selected === selected) continue;
    changes.push({
      table: "household_emergencies",
      id: row.id,
      op: "patch",
      fields: { selected, updated_at: at, field_ts: stamp(["selected"], at) },
    });
  }
  return changes;
}

/** The household's chosen emergency ids: selected rows only, other households' rows left out. */
export function emergenciesOf(rows: HouseholdRows): string[] {
  const householdId = rows.household?.id;
  return rows.emergencies
    .filter((r) => r.household_id === householdId && r.selected)
    .map((r) => r.emergency);
}

type Change<R extends { updated_at: string; field_ts: FieldTs }> =
  | { op: "insert"; fields: R }
  | { op: "patch"; fields: Partial<R> & Pick<R, "updated_at" | "field_ts"> };

function applyOne<R extends { updated_at: string; field_ts: FieldTs }>(
  row: R | undefined,
  id: string,
  change: Change<R>,
): R {
  if (change.op === "insert") return { ...change.fields };
  if (!row) throw new Error(`Patch for a missing row: ${id}`);
  return { ...row, ...change.fields, field_ts: { ...row.field_ts, ...change.fields.field_ts } };
}

function upsert<R extends { id: string; updated_at: string; field_ts: FieldTs }>(
  rows: readonly R[],
  id: string,
  change: Change<R>,
): R[] {
  const row = rows.find((r) => r.id === id);
  const next = applyOne(row, id, change);
  return row ? rows.map((r) => (r === row ? next : r)) : [...rows, next];
}

/**
 * Applies row changes locally, as a store writes them: an insert adds (or
 * replaces) the row, a patch overwrites its columns and merges `field_ts` per
 * column. Throws on a patch for a row that does not exist.
 */
export function applyChanges(rows: HouseholdRows, changes: readonly RowChange[]): HouseholdRows {
  let { household, needs, steps, ticks, emergencies } = rows;
  for (const change of changes) {
    switch (change.table) {
      case "households":
        household = applyOne(
          household?.id === change.id ? household : undefined,
          change.id,
          change,
        );
        break;
      case "household_needs":
        needs = upsert(needs, change.id, change);
        break;
      case "household_steps":
        steps = upsert(steps, change.id, change);
        break;
      case "household_ticks":
        ticks = upsert(ticks, change.id, change);
        break;
      case "household_emergencies":
        emergencies = upsert(emergencies, change.id, change);
        break;
    }
  }
  return { household, needs, steps, ticks, emergencies };
}

/**
 * The rows of a `Household`, every `field_ts` set to its `updatedAt`. Only
 * selected set elements get a row, and there are no ticks or emergencies.
 * For the memory store and test fixtures.
 */
export function toRows(household: Household): HouseholdRows {
  const { id, updatedAt: at } = household;
  return {
    household: householdRow(id, flatten(household.name, household), at),
    needs: household.needs.map((need) => needRow(id, need, at)),
    steps: household.completedSteps.map((step) => stepRow(id, step, at)),
    ticks: [],
    emergencies: [],
  };
}

/** A v1 record as a current `Household`: no name, version 2. */
export function fromV1(record: HouseholdV1): Household {
  return { ...record, name: null, schemaVersion: SCHEMA_VERSION };
}

/**
 * Converts an S-01 record (schema version 1) into rows, validated with the
 * frozen `householdV1Schema`. Every `field_ts` is the v1 `updatedAt`.
 * Throws HouseholdStoreError("invalid") when the record is not a valid v1 record.
 */
export function migrateV1(record: unknown): HouseholdRows {
  const parsed = householdV1Schema.safeParse(record);
  if (!parsed.success) throw new HouseholdStoreError("invalid", { cause: parsed.error });
  return toRows(fromV1(parsed.data));
}
