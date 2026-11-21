import { describe, expect, it } from "vitest";
import { addedItemCount, buildPlan, planStage } from "./build";
import { PLAN_ITEMS } from "./content";
import { defaultSummary, largeSummary, minimalSummary, summaryOf } from "./fixtures";
import type { Plan, PlanItem, PlanRowData } from "./types";

/** Every row of a plan, tiers first, then sections. */
function rowsOf(plan: Plan): PlanRowData[] {
  return [
    ...plan.tiers.flatMap((tier) => tier.categories.flatMap((category) => category.rows)),
    ...plan.sections.flatMap((section) => section.rows),
  ];
}

/** Item ids per tier and category, and per section: the plan's outline. */
function outline(plan: Plan) {
  return {
    tiers: plan.tiers.map((tier) => ({
      tier: tier.tier,
      categories: tier.categories.map((c) => [c.id, c.rows.map((r) => r.itemId)]),
    })),
    sections: plan.sections.map((s) => [s.id, s.rows.map((r) => r.itemId)]),
  };
}

function row(plan: Plan, itemId: string, opts: { pointer?: boolean } = {}): PlanRowData {
  const found = rowsOf(plan).find(
    (r) => r.itemId === itemId && (r.pointer !== undefined) === (opts.pointer ?? false),
  );
  if (!found) throw new Error(`no row ${itemId}`);
  return found;
}

const has = (plan: Plan, itemId: string) => rowsOf(plan).some((r) => r.itemId === itemId);

/** A one-item content list for rule tests. */
function item(overrides: Partial<PlanItem>): PlanItem {
  return {
    id: "test-item",
    placement: { kind: "tier", tier: 1, category: "waterFood" },
    unit: "l",
    amount: { fixed: 1 },
    roundStep: 1,
    intendedSource: "prepwise",
    verified: false,
    ...overrides,
  };
}

describe("buildPlan — default household (2 adults, small child, medium dog, medicines, diet, flat)", () => {
  const plan = buildPlan(defaultSummary(), 3);

  it("lays out three tiers with categories, then the small-child and pet sections", () => {
    expect(outline(plan)).toEqual({
      tiers: [
        {
          tier: 1,
          categories: [
            ["waterFood", ["drinking-water", "shelf-stable-food", "small-child-food"]],
            ["medicine", ["regular-medicines", "first-aid-kit"]],
          ],
        },
        {
          tier: 2,
          categories: [
            ["light", ["flashlight", "flashlight-batteries"]],
            ["communication", ["battery-radio", "power-bank"]],
            ["hygiene", ["toilet-paper", "hand-hygiene", "wet-wipes", "flushing-water"]],
            ["warmth", ["blanket"]],
          ],
        },
        {
          tier: 3,
          categories: [
            ["documents", ["document-copies", "cash"]],
            ["tools", ["multitool", "duct-tape"]],
          ],
        },
      ],
      sections: [
        ["smallChild", ["small-child-food", "diapers"]],
        ["pets", ["pet-water", "pet-food", "pet-kit"]],
      ],
    });
  });

  it("counts 22 real items, not the pointer row", () => {
    expect(plan.itemCount).toBe(22);
    expect(rowsOf(plan).filter((r) => !r.pointer)).toHaveLength(22);
    expect(rowsOf(plan)).toHaveLength(23);
  });

  it("makes water the first row: 3 l × 3 people × 3 days = 27 l", () => {
    expect(plan.tiers[0].categories[0].rows[0]).toEqual({
      itemId: "drinking-water",
      quantity: 27,
      unit: "l",
      formula: {
        kind: "perDay",
        unit: "l",
        days: 3,
        terms: [{ who: "people", count: 3, amount: 3 }],
      },
      source: "prepwise",
      first: true,
    });
    expect(
      rowsOf(plan)
        .filter((r) => r.first)
        .map((r) => r.itemId),
    ).toEqual(["drinking-water"]);
  });

  it("marks the food row for the diet, and only that row", () => {
    expect(row(plan, "shelf-stable-food")).toMatchObject({
      quantity: 18,
      unit: "portion",
      diet: true,
      formula: { kind: "perDay", terms: [{ who: "adults", count: 2, amount: 3 }] },
    });
    expect(
      rowsOf(plan)
        .filter((r) => r.diet)
        .map((r) => r.itemId),
    ).toEqual(["shelf-stable-food"]);
  });

  it("shows medicines as the household's own dose, never a number of pills", () => {
    const medicines = row(plan, "regular-medicines");
    expect(medicines).toEqual({
      itemId: "regular-medicines",
      quantity: 3,
      unit: "day",
      formula: { kind: "dose", days: 3 },
      source: "prepwise",
      first: false,
    });
    expect(medicines.formula).not.toHaveProperty("amount");
  });

  it("points from tier 1 to the small child's food in its section", () => {
    const pointer = row(plan, "small-child-food", { pointer: true });
    expect(pointer).toMatchObject({
      pointer: "smallChild",
      formula: { kind: "pointer", section: "smallChild" },
      first: false,
    });
    expect(plan.tiers[0].categories[0].rows.at(-1)).toBe(pointer);
  });

  it("keeps the tier on small-child rows", () => {
    expect(row(plan, "small-child-food")).toMatchObject({
      tier: 1,
      quantity: 3,
      unit: "day",
      formula: { kind: "forDays", days: 3, members: [{ who: "smallChildren", count: 1 }] },
    });
    expect(row(plan, "diapers")).toMatchObject({ tier: 2, quantity: 18, unit: "piece" });
  });

  it("puts pet items in a tierless 'dog' section", () => {
    const pets = plan.sections[1];
    expect(pets).toMatchObject({ id: "pets", petKind: "dog" });
    expect(pets.rows.every((r) => r.tier === undefined)).toBe(true);
    expect(row(plan, "pet-water")).toMatchObject({
      quantity: 4.5,
      formula: { kind: "perDay", terms: [{ who: "mediumDog", count: 1, amount: 1.5 }] },
    });
  });

  it("adds water for flushing in a flat, and no heating", () => {
    expect(row(plan, "flushing-water").quantity).toBe(45);
    expect(has(plan, "heating-fuel")).toBe(false);
  });

  it("gives household-wide items a fixed amount", () => {
    expect(row(plan, "first-aid-kit")).toMatchObject({
      quantity: 1,
      unit: "set",
      formula: { kind: "fixed", amount: 1, unit: "set" },
    });
  });

  it("counts per-member items without days", () => {
    expect(row(plan, "flashlight")).toMatchObject({
      quantity: 2,
      formula: {
        kind: "perMember",
        unit: "piece",
        terms: [{ who: "adults", count: 2, amount: 1 }],
      },
    });
    expect(row(plan, "blanket").quantity).toBe(3);
  });
});

describe("buildPlan — minimal household (1 adult, flat)", () => {
  const plan = buildPlan(minimalSummary(), 3);

  it("has the baseline only: three tiers, no sections", () => {
    expect(plan.sections).toEqual([]);
    expect(plan.tiers.map((t) => t.tier)).toEqual([1, 2, 3]);
    expect(outline(plan).tiers[0].categories).toEqual([
      ["waterFood", ["drinking-water", "shelf-stable-food"]],
      ["medicine", ["first-aid-kit"]],
    ]);
    expect(plan.itemCount).toBe(16);
  });

  it("has no diet flag, pointer, medicines or mobility rows", () => {
    expect(rowsOf(plan).some((r) => r.diet || r.pointer)).toBe(false);
    expect(has(plan, "regular-medicines")).toBe(false);
    expect(has(plan, "mobility-aid-power")).toBe(false);
    expect(plan.tiers[1].categories.map((c) => c.id)).not.toContain("mobility");
  });

  it("counts water for one person", () => {
    expect(row(plan, "drinking-water")).toMatchObject({
      quantity: 9,
      formula: { terms: [{ who: "adults", count: 1, amount: 3 }] },
    });
  });
});

describe("buildPlan — large household (9 people, 2 dogs, a cat, every need, house)", () => {
  const plan = buildPlan(largeSummary(), 3);

  it("counts 24 items in three tiers and two sections", () => {
    expect(plan.itemCount).toBe(24);
    expect(plan.tiers).toHaveLength(3);
    expect(plan.sections.map((s) => s.id)).toEqual(["smallChild", "pets"]);
  });

  it("feeds everyone but the small child from the shared food", () => {
    expect(row(plan, "drinking-water").quantity).toBe(81);
    expect(row(plan, "shelf-stable-food")).toMatchObject({
      quantity: 72,
      diet: true,
      formula: { terms: [{ who: "people", count: 8, amount: 3 }] },
    });
  });

  it("adds backup power for medical equipment in tier 1", () => {
    expect(outline(plan).tiers[0].categories[1]).toEqual([
      "medicine",
      ["regular-medicines", "medical-equipment-power", "first-aid-kit"],
    ]);
    expect(row(plan, "medical-equipment-power")).toMatchObject({
      quantity: 3,
      unit: "day",
      formula: { kind: "forDays", days: 3, members: [] },
    });
  });

  it("adds heating in a house and mobility power for limited mobility, both in tier 2", () => {
    const tier2 = outline(plan).tiers[1].categories;
    expect(tier2).toContainEqual(["warmth", ["blanket", "heating-fuel"]]);
    expect(tier2).toContainEqual(["mobility", ["mobility-aid-power"]]);
    expect(has(plan, "flushing-water")).toBe(false);
  });

  it("names the pet section 'animals' and splits pet water by kind", () => {
    const pets = plan.sections[1];
    expect(pets).toMatchObject({ id: "pets", petKind: "animals" });
    // (0.5 small dog + 2 large dog + 0.3 cat) × 3 days = 8.4 → 8.5 at step 0.5.
    expect(row(plan, "pet-water")).toMatchObject({
      quantity: 8.5,
      formula: {
        kind: "perDay",
        days: 3,
        terms: [
          { who: "smallDog", count: 1, amount: 0.5 },
          { who: "largeDog", count: 1, amount: 2 },
          { who: "cat", count: 1, amount: 0.3 },
        ],
      },
    });
    expect(row(plan, "pet-kit")).toMatchObject({
      quantity: 3,
      formula: { terms: [{ who: "animals", count: 3, amount: 1 }] },
    });
    expect(row(plan, "pet-food").formula).toEqual({
      kind: "forDays",
      days: 3,
      members: [
        { who: "smallDog", count: 1 },
        { who: "largeDog", count: 1 },
        { who: "cat", count: 1 },
      ],
    });
  });
});

describe("buildPlan — rules", () => {
  it("shows no emergency item when none is chosen: baseline only", () => {
    const emergencyIds = PLAN_ITEMS.filter((i) => i.when && "emergency" in i.when).map((i) => i.id);
    expect(emergencyIds).toContain("candles-and-lighter");
    for (const summary of [defaultSummary(), minimalSummary(), largeSummary()]) {
      const plan = buildPlan(summary, 3);
      for (const id of emergencyIds) expect(has(plan, id), id).toBe(false);
      expect(plan.emergencyItemCount).toBe(0);
      expect(plan.sections.some((section) => section.id === "backpack")).toBe(false);
      expect(rowsOf(plan).every((r) => r.emergencies === undefined)).toBe(true);
    }
  });

  const BACKPACK = [
    "evacuation-backpack",
    "backpack-water",
    "backpack-water-filter",
    "backpack-first-aid",
    "backpack-food",
    "backpack-torch",
    "backpack-radio",
    "backpack-thermal-rain",
    "backpack-documents-cash",
    "backpack-hygiene",
  ];
  const ADDED = {
    blackout: ["candles-and-lighter", "walkie-talkies", "camping-stove"],
    "no-tap-water": ["bucket-with-bags", "water-purification-tablets", "water-canister"],
    "severe-weather": ["thermal-blanket", "warm-clothing"],
    // A house, so the sandbags are there.
    flood: ["sandbags", "waterproof-document-pouch", "signal-cloths", ...BACKPACK],
    evacuation: BACKPACK,
  } as const;

  it.each(Object.entries(ADDED))("adds the items of %s and only those", (id, ids) => {
    const baseline = new Set(rowsOf(buildPlan(largeSummary(), 3)).map((r) => r.itemId));
    const plan = buildPlan(largeSummary(), 3, [id]);
    const added = rowsOf(plan)
      .map((r) => r.itemId)
      .filter((itemId) => !baseline.has(itemId));
    expect(added.sort()).toEqual([...ids].sort());
    expect(plan.emergencyItemCount).toBe(ids.length);
    for (const itemId of ids) expect(row(plan, itemId).emergencies).toEqual([id]);
  });

  it("puts the backpack in its own last section, tagged with the emergencies that brought it", () => {
    const plan = buildPlan(largeSummary(), 3, ["flood"]);
    const last = plan.sections.at(-1);
    expect(last).toMatchObject({ id: "backpack", emergencies: ["flood"] });
    expect(last?.rows.map((r) => r.itemId)).toEqual(BACKPACK);
    // No tier and no category: the rows live only in the section.
    expect(last?.rows.every((r) => r.tier === undefined)).toBe(true);
    expect(plan.sections.map((s) => s.id)).toEqual(["smallChild", "pets", "backpack"]);
  });

  it("adds the backpack once for flood and evacuation, tagged with both", () => {
    const plan = buildPlan(largeSummary(), 3, ["evacuation", "flood"]);
    expect(plan.sections.filter((s) => s.id === "backpack")).toHaveLength(1);
    const ids = rowsOf(plan).map((r) => r.itemId);
    for (const id of BACKPACK) expect(ids.filter((x) => x === id)).toHaveLength(1);
    expect(plan.sections.at(-1)).toMatchObject({ emergencies: ["flood", "evacuation"] });
    expect(row(plan, "backpack-torch").emergencies).toEqual(["flood", "evacuation"]);
    // Backpack (10) + the flood extras (3) counted once each.
    expect(plan.emergencyItemCount).toBe(13);
  });

  it("counts backpack amounts for every person, small children included, no pets", () => {
    const plan = buildPlan(defaultSummary(), 3, ["evacuation"]);
    // 2 adults + 1 small child = 3 people; the dog adds nothing.
    expect(row(plan, "evacuation-backpack").quantity).toBe(3);
    expect(row(plan, "backpack-water").quantity).toBe(12);
    expect(row(plan, "backpack-food").quantity).toBe(9);
  });

  it("adds sandbags for flood only in a house", () => {
    expect(has(buildPlan(minimalSummary(), 3, ["flood"]), "sandbags")).toBe(false);
    expect(has(buildPlan(defaultSummary(), 3, ["flood"]), "sandbags")).toBe(false);
    expect(has(buildPlan(largeSummary(), 3, ["flood"]), "sandbags")).toBe(true);
    // Evacuation alone never brings sandbags, even in a house.
    expect(has(buildPlan(largeSummary(), 3, ["evacuation"]), "sandbags")).toBe(false);
  });

  it("ignores ids that are not known emergencies", () => {
    expect(outline(buildPlan(defaultSummary(), 3, ["tornado", "", "Flood"]))).toEqual(
      outline(buildPlan(defaultSummary(), 3)),
    );
    const mixed = buildPlan(defaultSummary(), 3, ["tornado", "blackout"]);
    expect(mixed.emergencyItemCount).toBe(3);
  });

  it("keeps the plan the same whatever order the emergencies come in", () => {
    expect(buildPlan(largeSummary(), 3, ["flood", "blackout"])).toEqual(
      buildPlan(largeSummary(), 3, ["blackout", "flood"]),
    );
  });

  it("counts an item that holds because of an emergency in itemCount too", () => {
    const base = buildPlan(defaultSummary(), 3);
    const plan = buildPlan(defaultSummary(), 3, ["severe-weather"]);
    expect(plan.itemCount).toBe(base.itemCount + 2);
    expect(plan.emergencyItemCount).toBe(2);
  });

  it("applies an emergency trigger with a housing from a custom content list", () => {
    const items = [
      item({ id: "a", when: { emergency: ["flood", "evacuation"], housing: "house" } }),
      item({ id: "b", when: { emergency: ["blackout"] } }),
    ];
    expect(
      rowsOf(buildPlan(largeSummary(), 3, ["evacuation"], items)).map((r) => r.itemId),
    ).toEqual(["a"]);
    expect(rowsOf(buildPlan(minimalSummary(), 3, ["evacuation"], items))).toEqual([]);
  });

  it("shows every row of every fixture as a PREPWISE recommendation", () => {
    for (const summary of [defaultSummary(), minimalSummary(), largeSummary()]) {
      expect(rowsOf(buildPlan(summary, 3)).every((r) => r.source === "prepwise")).toBe(true);
    }
  });

  it("shows a verified official item with a source as official", () => {
    const items = [
      item({
        intendedSource: "official",
        verified: true,
        sourceId: "poradnik-bezpieczenstwa-portal",
      }),
    ];
    expect(rowsOf(buildPlan(minimalSummary(), 3, [], items))[0].source).toBe("official");
  });

  it("scales with days other than 3", () => {
    const plan = buildPlan(defaultSummary(), 7);
    expect(plan.days).toBe(7);
    expect(row(plan, "drinking-water").quantity).toBe(63);
    expect(row(plan, "regular-medicines")).toMatchObject({
      quantity: 7,
      formula: { kind: "dose", days: 7 },
    });
    expect(row(plan, "pet-water").quantity).toBe(10.5);
    // Per-member and fixed items don't change with the days.
    expect(row(plan, "flashlight").quantity).toBe(2);
    expect(row(plan, "first-aid-kit").quantity).toBe(1);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects %s days", (days) => {
    expect(() => buildPlan(minimalSummary(), days)).toThrow(RangeError);
  });

  it("rounds up to the item's step", () => {
    const items = [item({ amount: { perDay: { adults: 1.1 } }, roundStep: 1 })];
    expect(rowsOf(buildPlan(minimalSummary(), 3, [], items))[0].quantity).toBe(4);
  });

  it("does not add a step for float error (0.2 × 3 with step 0.1 is 0.6)", () => {
    const items = [item({ amount: { perDay: { adults: 0.2 } }, roundStep: 0.1 })];
    expect(rowsOf(buildPlan(minimalSummary(), 3, [], items))[0].quantity).toBe(0.6);
  });

  it("sums groups whose daily amounts differ and keeps them as separate terms", () => {
    const items = [item({ amount: { perDay: { adults: 3, seniors: 4, children: 3 } } })];
    const summary = summaryOf({
      people: { adults: 2, seniors: 1, children: 1, smallChildren: 0 },
    });
    const [only] = rowsOf(buildPlan(summary, 3, [], items));
    // (3 × 2 + 4 × 1 + 3 × 1) × 3 = 39
    expect(only.quantity).toBe(39);
    expect(only.formula).toEqual({
      kind: "perDay",
      unit: "l",
      days: 3,
      terms: [
        { who: "people", count: 3, amount: 3 },
        { who: "seniors", count: 1, amount: 4 },
      ],
    });
  });

  it("leaves out items nobody in the household needs, and empty categories", () => {
    // Only small children: no adult food, torches or batteries.
    const plan = buildPlan(
      summaryOf({ people: { adults: 0, seniors: 0, children: 0, smallChildren: 1 } }),
      3,
    );
    expect(has(plan, "shelf-stable-food")).toBe(false);
    expect(plan.tiers[1].categories.map((c) => c.id)).not.toContain("light");
    expect(has(plan, "small-child-food")).toBe(true);
  });

  it("drops a tier with no items", () => {
    const items = [item({ placement: { kind: "tier", tier: 2, category: "light" } })];
    const plan = buildPlan(minimalSummary(), 3, [], items);
    expect(plan.tiers.map((t) => t.tier)).toEqual([2]);
    expect(plan.itemCount).toBe(1);
  });

  it.each([
    ["only dogs", { smallDog: 1, mediumDog: 0, largeDog: 2, cat: 0, otherSmall: 0 }, "dog"],
    [
      "a dog and a cat",
      { smallDog: 0, mediumDog: 1, largeDog: 0, cat: 1, otherSmall: 0 },
      "animals",
    ],
    ["only a cat", { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 1, otherSmall: 0 }, "animals"],
    [
      "a small animal",
      { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 2 },
      "animals",
    ],
  ] as const)("names the pet section for %s", (_, pets, kind) => {
    const plan = buildPlan(
      summaryOf({
        people: { adults: 1, seniors: 0, children: 0, smallChildren: 0 },
        hasPets: true,
        pets,
      }),
      3,
    );
    expect(plan.sections).toEqual([expect.objectContaining({ id: "pets", petKind: kind })]);
  });

  it("has no pet section when pets are switched off, whatever the counts", () => {
    const plan = buildPlan(
      summaryOf({
        hasPets: false,
        pets: { smallDog: 1, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 },
        people: { adults: 1, seniors: 0, children: 0, smallChildren: 0 },
      }),
      3,
    );
    expect(plan.sections).toEqual([]);
  });

  it.each([
    [{ hasPet: "dog" } as const, { mediumDog: 1 }, true],
    [{ hasPet: "dog" } as const, { cat: 1 }, false],
    [{ hasPet: "cat" } as const, { cat: 1 }, true],
    [{ hasPet: "cat" } as const, { smallDog: 1 }, false],
    [{ hasPeople: "seniors" } as const, {}, false],
  ])("applies the trigger %o", (when, pets, included) => {
    const summary = summaryOf({
      people: { adults: 1, seniors: 0, children: 0, smallChildren: 0 },
      hasPets: true,
      pets: { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0, ...pets },
    });
    expect(buildPlan(summary, 3, [], [item({ when })]).itemCount).toBe(included ? 1 : 0);
  });

  it("is in the 'ready' stage until the list exists, then 'collecting'", () => {
    const plan = buildPlan(minimalSummary(), 3);
    expect(planStage(plan, false)).toBe("ready");
    expect(planStage(plan, true)).toBe("collecting");
    expect(planStage(plan, true, false)).toBe("collecting");
    expect(planStage(plan, true, true)).toBe("complete");
    // Without a list nothing can be complete.
    expect(planStage(plan, false, true)).toBe("ready");
  });
});

describe("addedItemCount", () => {
  const summary = largeSummary();

  it("counts what choosing adds to nothing chosen", () => {
    expect(addedItemCount(summary, 3, [], [])).toBe(0);
    expect(addedItemCount(summary, 3, [], ["blackout"])).toBe(3);
    expect(addedItemCount(summary, 3, [], ["flood", "evacuation"])).toBe(13);
  });

  it("counts a shared item once and only what the saved choice lacks", () => {
    // The backpack is already there; flood brings only its own 3 items.
    expect(addedItemCount(summary, 3, ["evacuation"], ["evacuation", "flood"])).toBe(3);
  });

  it("counts what a swapped-in emergency adds", () => {
    expect(addedItemCount(summary, 3, ["blackout"], ["severe-weather"])).toBe(2);
    expect(addedItemCount(summary, 3, ["flood"], ["evacuation"])).toBe(0);
  });

  it("is zero when emergencies are removed", () => {
    expect(addedItemCount(summary, 3, ["blackout", "flood"], ["blackout"])).toBe(0);
    expect(addedItemCount(summary, 3, ["blackout"], [])).toBe(0);
  });

  it("counts sandbags only for a house and ignores unknown ids", () => {
    expect(addedItemCount(minimalSummary(), 3, [], ["flood"])).toBe(12);
    expect(addedItemCount(summary, 3, [], ["flood"])).toBe(13);
    expect(addedItemCount(summary, 3, [], ["tornado"])).toBe(0);
  });
});
