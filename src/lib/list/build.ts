import type { Tick } from "@/lib/household/types";
import { PLAN_ITEMS } from "@/lib/plan/content";
import {
  CATEGORIES,
  TIERS,
  type CategoryId,
  type Plan,
  type PlanItem,
  type PlanRowData,
  type TierLevel,
} from "@/lib/plan/types";
import type { ListGroup, ListProgress, ListRow, ShoppingList } from "./types";

/**
 * An item is done when its tick is selected and the ticked quantity covers the
 * plan's current quantity. Plan quantities are trimmed to their step's
 * decimals (`roundUpToStep`), so a plain `>=` compares exactly.
 */
function isDone(row: PlanRowData, tick: Tick | undefined): boolean {
  return tick !== undefined && tick.selected && tick.quantity >= row.quantity;
}

/** Not-done rows first, then done rows, each in plan order. */
function ordered(rows: ListRow[]): ListRow[] {
  return [...rows.filter((r) => !r.done), ...rows.filter((r) => r.done)];
}

function group<G extends Omit<ListGroup, "rows" | "done" | "total">>(
  base: G,
  rows: ListRow[],
): G & { rows: ListRow[]; done: number; total: number } {
  return {
    ...base,
    rows: ordered(rows),
    done: rows.filter((r) => r.done).length,
    total: rows.length,
  };
}

/**
 * Builds the shopping list from the plan and the saved ticks. Groups are tiers
 * 1–3, with the small child's items inside their tier at their category's
 * position (rows without a category close their tier), then the pets, then the
 * evacuation backpack. Pointer rows are dropped, ticks for items not in the plan are ignored, and exactly
 * one not-done row is marked `first` ("Najpierw"), none when all are done.
 */
export function buildList(
  plan: Plan,
  ticks: readonly Tick[],
  items: readonly PlanItem[] = PLAN_ITEMS,
): ShoppingList {
  const tickByItem = new Map(ticks.map((tick) => [tick.item, tick]));
  const categoryOf = new Map(
    items.flatMap((item): [string, CategoryId][] =>
      item.placement.category ? [[item.id, item.placement.category]] : [],
    ),
  );
  const toListRow = (row: PlanRowData): ListRow => ({
    itemId: row.itemId,
    quantity: row.quantity,
    unit: row.unit,
    detailSource: row,
    done: isDone(row, tickByItem.get(row.itemId)),
    first: false,
  });

  // Tier → category (or "none" for a section row with no category) → rows, in plan order.
  type Slot = CategoryId | "none";
  const tierRows = new Map<TierLevel, Map<Slot, PlanRowData[]>>(
    TIERS.map((tier) => [tier, new Map()]),
  );
  const add = (tier: TierLevel, slot: Slot, row: PlanRowData) => {
    const slots = tierRows.get(tier)!;
    slots.set(slot, [...(slots.get(slot) ?? []), row]);
  };
  for (const tier of plan.tiers) {
    for (const category of tier.categories) {
      for (const row of category.rows) {
        if (row.pointer === undefined) add(tier.tier, category.id, row);
      }
    }
  }
  const petGroups: ListGroup[] = [];
  const backpackGroups: ListGroup[] = [];
  for (const section of plan.sections) {
    if (section.id === "pets") {
      petGroups.push(
        group({ kind: "pets", petKind: section.petKind }, section.rows.map(toListRow)),
      );
      continue;
    }
    if (section.id === "backpack") {
      backpackGroups.push(group({ kind: "backpack" }, section.rows.map(toListRow)));
      continue;
    }
    for (const row of section.rows) {
      if (row.tier === undefined) {
        throw new Error(`Section row ${row.itemId} has no tier to place it in.`);
      }
      add(row.tier, categoryOf.get(row.itemId) ?? "none", row);
    }
  }

  const tierGroups: ListGroup[] = TIERS.flatMap((tier) => {
    const slots = tierRows.get(tier)!;
    const rows = [...CATEGORIES, "none" as const].flatMap((slot) => slots.get(slot) ?? []);
    return rows.length > 0 ? [group({ kind: "tier", tier }, rows.map(toListRow))] : [];
  });

  const groups = [...tierGroups, ...petGroups, ...backpackGroups];
  const firstOpen = groups.flatMap((g) => g.rows).find((r) => !r.done);
  if (firstOpen) firstOpen.first = true;

  const progressOf = (of: ListGroup[]): ListProgress => {
    const total = of.reduce((sum, g) => sum + g.total, 0);
    const done = of.reduce((sum, g) => sum + g.done, 0);
    return { done, total, left: total - done };
  };
  return {
    groups,
    progress: progressOf(groups),
    home: progressOf([...tierGroups, ...petGroups]),
    backpack: backpackGroups.length > 0 ? progressOf(backpackGroups) : null,
  };
}
