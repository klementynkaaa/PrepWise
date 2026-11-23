/**
 * The shopping list's shape. Derived from the plan and the saved ticks; no
 * text: screens format every part with `list.*` and `plan.*` messages.
 */
import type { PetSectionKind, PlanRowData, TierLevel, Unit } from "@/lib/plan/types";

export type ListRow = {
  itemId: string;
  /** The plan's current quantity for the item. */
  quantity: number;
  unit: Unit;
  /** The plan row the detail line is formatted from; its `emergencies` name what added the row. */
  detailSource: PlanRowData;
  /** Ticked, and the ticked quantity still covers what the plan needs now. */
  done: boolean;
  /** The "Najpierw" row: the first not-done row of the whole list. */
  first: boolean;
};

type GroupCounts = { rows: ListRow[]; done: number; total: number };

/**
 * A group of rows. A union so own items (S-11) can add a kind that
 * `progress` does not count.
 */
export type ListGroup =
  | ({ kind: "tier"; tier: TierLevel } & GroupCounts)
  | ({ kind: "pets"; petKind: PetSectionKind } & GroupCounts)
  | ({ kind: "backpack" } & GroupCounts);

export type ListProgress = { done: number; total: number; left: number };

export type ShoppingList = {
  groups: ListGroup[];
  /** Plan items only, home supplies and backpack together; `left === 0` means complete. */
  progress: ListProgress;
  /** Everything but the evacuation backpack. */
  home: ListProgress;
  /** The evacuation backpack; null when the plan has no backpack section. */
  backpack: ListProgress | null;
};
