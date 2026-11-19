import { describe, expect, it } from "vitest";
import type { Tick } from "@/lib/household/types";
import { buildPlan } from "@/lib/plan/build";
import { defaultSummary, largeSummary, minimalSummary } from "@/lib/plan/fixtures";
import type { Plan, PlanRowData } from "@/lib/plan/types";
import { buildList } from "./build";
import type { ShoppingList } from "./types";

const defaultPlan = buildPlan(defaultSummary(), 3);

/** Item ids per group, in the order the list shows them. */
function outline(list: ShoppingList) {
  return list.groups.map((g) => [
    g.kind === "tier" ? `tier${g.tier}` : `pets:${g.petKind}`,
    g.rows.map((r) => r.itemId),
  ]);
}

/** A selected tick at the plan's current quantity for each item. */
function ticked(plan: Plan, ...itemIds: string[]): Tick[] {
  const rows = buildList(plan, []).groups.flatMap((g) => g.rows);
  return itemIds.map((item) => {
    const row = rows.find((r) => r.itemId === item);
    if (!row) throw new Error(`no row ${item}`);
    return { item, selected: true, quantity: row.quantity };
  });
}

const firstRows = (list: ShoppingList) => list.groups.flatMap((g) => g.rows).filter((r) => r.first);

const rowOf = (list: ShoppingList, itemId: string) => {
  const found = list.groups.flatMap((g) => g.rows).find((r) => r.itemId === itemId);
  if (!found) throw new Error(`no row ${itemId}`);
  return found;
};

describe("buildList — groups", () => {
  it("lays out the default household: child items inside tiers 1 and 2, pets last, no pointer", () => {
    const list = buildList(defaultPlan, []);
    expect(outline(list)).toEqual([
      [
        "tier1",
        [
          "drinking-water",
          "shelf-stable-food",
          "small-child-food",
          "regular-medicines",
          "first-aid-kit",
        ],
      ],
      [
        "tier2",
        [
          "flashlight",
          "flashlight-batteries",
          "battery-radio",
          "power-bank",
          "toilet-paper",
          "hand-hygiene",
          "wet-wipes",
          "flushing-water",
          "blanket",
          "diapers",
        ],
      ],
      ["tier3", ["document-copies", "cash", "multitool", "duct-tape"]],
      ["pets:dog", ["pet-water", "pet-food", "pet-kit"]],
    ]);
    expect(list.groups.flatMap((g) => g.rows).every((r) => !r.detailSource.pointer)).toBe(true);
  });

  it.each([
    ["default", defaultSummary(), 22],
    ["minimal", minimalSummary(), 16],
    ["large", largeSummary(), 24],
  ] as const)("counts every item of the %s plan once (%i)", (_, summary, count) => {
    const plan = buildPlan(summary, 3);
    const list = buildList(plan, []);
    const ids = list.groups.flatMap((g) => g.rows.map((r) => r.itemId));
    expect(plan.itemCount).toBe(count);
    expect(list.progress).toEqual({ done: 0, total: count, left: count });
    expect(ids).toHaveLength(count);
    expect(new Set(ids).size).toBe(count);
    expect(list.groups.reduce((sum, g) => sum + g.total, 0)).toBe(count);
  });

  it("has only tier groups for the minimal household", () => {
    const list = buildList(buildPlan(minimalSummary(), 3), []);
    expect(list.groups.map((g) => g.kind)).toEqual(["tier", "tier", "tier"]);
  });

  it("puts the pet group last for the large household, named for 'animals'", () => {
    const list = buildList(buildPlan(largeSummary(), 3), []);
    expect(list.groups.at(-1)).toMatchObject({ kind: "pets", petKind: "animals", total: 3 });
    expect(outline(list)[1][1]).toEqual(expect.arrayContaining(["diapers"]));
  });

  it("carries the plan row as the detail source", () => {
    const water = rowOf(buildList(defaultPlan, []), "drinking-water");
    expect(water).toMatchObject({ quantity: 27, unit: "l", done: false, first: true });
    expect(water.detailSource).toBe(defaultPlan.tiers[0].categories[0].rows[0]);
  });

  it("refuses a non-pet section row with no tier", () => {
    const row: PlanRowData = {
      itemId: "diapers",
      quantity: 1,
      unit: "piece",
      formula: { kind: "fixed", amount: 1, unit: "piece" },
      source: "prepwise",
      first: false,
    };
    const plan: Plan = {
      days: 3,
      tiers: [],
      sections: [{ id: "smallChild", rows: [row] }],
      itemCount: 1,
    };
    expect(() => buildList(plan, [])).toThrow(/no tier/);
  });
});

describe("buildList — ticks and order", () => {
  it("moves a ticked row to the bottom of its group and counts it", () => {
    const list = buildList(defaultPlan, ticked(defaultPlan, "shelf-stable-food", "first-aid-kit"));
    expect(outline(list)[0][1]).toEqual([
      "drinking-water",
      "small-child-food",
      "regular-medicines",
      "shelf-stable-food",
      "first-aid-kit",
    ]);
    expect(list.groups[0]).toMatchObject({ done: 2, total: 5 });
    expect(list.progress).toEqual({ done: 2, total: 22, left: 20 });
  });

  it("puts 'Najpierw' on water first, then on the next not-done row of the list", () => {
    expect(firstRows(buildList(defaultPlan, [])).map((r) => r.itemId)).toEqual(["drinking-water"]);
    const afterWater = buildList(defaultPlan, ticked(defaultPlan, "drinking-water"));
    expect(firstRows(afterWater).map((r) => r.itemId)).toEqual(["shelf-stable-food"]);
  });

  it("moves 'Najpierw' to the next group when a group is finished", () => {
    const tier1 = buildList(defaultPlan, []).groups[0].rows.map((r) => r.itemId);
    const list = buildList(defaultPlan, ticked(defaultPlan, ...tier1));
    expect(list.groups[0]).toMatchObject({ done: 5, total: 5 });
    expect(firstRows(list).map((r) => r.itemId)).toEqual(["flashlight"]);
  });

  it("has no 'Najpierw' when everything is done", () => {
    const all = buildList(defaultPlan, []).groups.flatMap((g) => g.rows.map((r) => r.itemId));
    const list = buildList(defaultPlan, ticked(defaultPlan, ...all));
    expect(firstRows(list)).toEqual([]);
    expect(list.progress).toEqual({ done: 22, total: 22, left: 0 });
    expect(list.groups.every((g) => g.done === g.total)).toBe(true);
  });

  it("treats an unticked row as not done", () => {
    const list = buildList(defaultPlan, [{ item: "cash", selected: false, quantity: 1 }]);
    expect(rowOf(list, "cash").done).toBe(false);
    expect(list.progress.done).toBe(0);
  });

  it("ignores ticks for items not in the plan", () => {
    const list = buildList(defaultPlan, [
      { item: "heating-fuel", selected: true, quantity: 99 },
      { item: "no-such-item", selected: true, quantity: 1 },
    ]);
    expect(list.progress).toEqual({ done: 0, total: 22, left: 22 });
  });
});

describe("buildList — the done rule", () => {
  const water = (quantity: number): Tick => ({ item: "drinking-water", selected: true, quantity });

  it("shows a grown quantity as not done until ticked again", () => {
    const longer = buildPlan(defaultSummary(), 7); // water 63 l
    expect(rowOf(buildList(longer, [water(27)]), "drinking-water").done).toBe(false);
    expect(rowOf(buildList(longer, [water(63)]), "drinking-water").done).toBe(true);
  });

  it("keeps a smaller or equal quantity done", () => {
    expect(rowOf(buildList(defaultPlan, [water(27)]), "drinking-water").done).toBe(true);
    expect(rowOf(buildList(defaultPlan, [water(81)]), "drinking-water").done).toBe(true);
  });

  it("counts a returning item as done again at the same or a smaller amount", () => {
    const large = buildPlan(largeSummary(), 3);
    const heating: Tick = { item: "heating-fuel", selected: true, quantity: 3 };
    // A flat drops heating; the tick stays and is ignored.
    expect(buildList(defaultPlan, [heating]).progress.done).toBe(0);
    // Back in a house, it is done again.
    expect(rowOf(buildList(large, [heating]), "heating-fuel").done).toBe(true);
    // Water ticked at 81 l in the large household covers the default household's 27 l.
    expect(
      rowOf(buildList(defaultPlan, ticked(large, "drinking-water")), "drinking-water").done,
    ).toBe(true);
  });

  it("compares 0.5-step pet water exactly", () => {
    const large = buildPlan(largeSummary(), 3); // pet water 8.5 l
    const pet = (quantity: number): Tick => ({ item: "pet-water", selected: true, quantity });
    expect(rowOf(buildList(large, [pet(8.5)]), "pet-water").done).toBe(true);
    expect(rowOf(buildList(large, [pet(8)]), "pet-water").done).toBe(false);
    // 4.5 l for three days; seven days need 10.5 l.
    const longer = buildPlan(defaultSummary(), 7);
    expect(rowOf(buildList(longer, ticked(defaultPlan, "pet-water")), "pet-water").done).toBe(
      false,
    );
    expect(rowOf(buildList(longer, ticked(longer, "pet-water")), "pet-water").done).toBe(true);
  });
});
