import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { messages } from "@/i18n/messages";
import { effectiveSource } from "./build";
import { PLAN_ITEMS, SOURCES } from "./content";
import {
  CATEGORIES,
  SECTIONS,
  TIERS,
  UNITS,
  type MemberGroup,
  type PlanItem,
  type RegisterSource,
} from "./types";

const PEOPLE: readonly MemberGroup[] = ["adults", "seniors", "children", "smallChildren"];

const t = createTranslator({ locale: "pl", messages, namespace: "plan" });
/** Item keys are built from slugs at runtime, so look them up untyped. */
const tItem = t as unknown as (key: string, values: Record<string, string>) => string;
const itemMessages: Record<string, { name?: string; note?: string; listName?: string }> =
  messages.plan.items;

/** Arguments every item message may use: the pet section kind and the children for the kit note. */
const itemArgs = { kind: "dog", kids: "none" } as const;

describe("plan content", () => {
  it("has unique kebab-case slugs", () => {
    const ids = PLAN_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("gives every slug a name in plan.items, and every name and note renders", () => {
    for (const item of PLAN_ITEMS) {
      expect(itemMessages[item.id]?.name, item.id).toBeTruthy();
      expect(tItem(`items.${item.id}.name`, itemArgs)).not.toBe("");
      if (itemMessages[item.id]?.note !== undefined) {
        expect(tItem(`items.${item.id}.note`, itemArgs)).not.toBe("");
      }
    }
  });

  it("gives every slug a short list name that renders for every pet kind", () => {
    for (const item of PLAN_ITEMS) {
      expect(itemMessages[item.id]?.listName, item.id).toBeTruthy();
      for (const kind of ["dog", "animals"]) {
        expect(tItem(`items.${item.id}.listName`, { ...itemArgs, kind })).not.toBe("");
      }
    }
  });

  it("has no message for an item that does not exist", () => {
    const ids = new Set(PLAN_ITEMS.map((item) => item.id));
    expect(Object.keys(itemMessages).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("names every unit, category, tier and section", () => {
    for (const unit of UNITS) expect(t(`units.${unit}`, { count: 1 })).not.toBe("");
    for (const id of CATEGORIES) expect(t(`categories.${id}`)).not.toBe("");
    for (const tier of TIERS) expect(t(`tiers.${tier}`)).not.toBe("");
    for (const id of SECTIONS) expect(t(`sections.${id}`, { kind: "dog" })).not.toBe("");
  });

  it("uses only draft figures: every item is unverified", () => {
    expect(PLAN_ITEMS.filter((item) => item.verified)).toEqual([]);
  });

  it("shows every unverified item as a PREPWISE recommendation", () => {
    for (const item of PLAN_ITEMS.filter((i) => !i.verified)) {
      expect(effectiveSource(item), item.id).toBe("prepwise");
    }
  });

  it("marks exactly one item first: drinking water", () => {
    expect(PLAN_ITEMS.filter((item) => item.first).map((item) => item.id)).toEqual([
      "drinking-water",
    ]);
  });

  it("keeps the content consistent with its shape", () => {
    for (const item of PLAN_ITEMS) {
      const { amount, placement } = item;
      const daysOnly = "dose" in amount || "forDays" in amount;
      expect(item.unit === "day", item.id).toBe(daysOnly);
      expect(item.roundStep, item.id).toBeGreaterThan(0);

      if (placement.kind === "section" && placement.section === "pets") {
        expect(placement.tier, item.id).toBeUndefined();
      }
      if (placement.kind === "section" && placement.section === "smallChild") {
        expect(placement.tier, item.id).toBeDefined();
      }
      if (item.pointerInTier1) {
        expect(placement.kind === "section" && placement.section === "smallChild", item.id).toBe(
          true,
        );
        expect(placement.kind === "section" && placement.category, item.id).toBeTruthy();
      }

      const groups =
        "perDay" in amount
          ? Object.keys(amount.perDay)
          : "perMember" in amount
            ? Object.keys(amount.perMember)
            : [];
      const people = groups.filter((g) => PEOPLE.includes(g as MemberGroup));
      // One item counts people or animals, never both.
      expect(people.length === 0 || people.length === groups.length, item.id).toBe(true);
    }
  });
});

describe("effectiveSource", () => {
  const sources: readonly RegisterSource[] = [
    { id: "gov", kind: "official", url: "https://www.gov.pl/x" },
    { id: "blog", kind: "other", url: "https://example.com/x" },
  ];
  const base: PlanItem = {
    id: "x",
    placement: { kind: "tier", tier: 1, category: "waterFood" },
    unit: "l",
    amount: { fixed: 1 },
    roundStep: 1,
    intendedSource: "official",
    verified: true,
    sourceId: "gov" as PlanItem["sourceId"],
  };

  it("is official only for a verified official figure citing an official register source", () => {
    expect(effectiveSource(base, sources)).toBe("official");
  });

  it.each<[string, Partial<PlanItem>]>([
    ["unverified", { verified: false }],
    ["no source id", { sourceId: undefined }],
    ["an unknown source id", { sourceId: "missing" as PlanItem["sourceId"] }],
    ["a non-official register source", { sourceId: "blog" as PlanItem["sourceId"] }],
    ["a PREPWISE figure", { intendedSource: "prepwise" }],
  ])("is prepwise for %s", (_, change) => {
    expect(effectiveSource({ ...base, ...change }, sources)).toBe("prepwise");
  });

  it("decides for a scenario the same way: draft is prepwise, verified official is official", () => {
    const scenario = {
      intendedSource: "official" as const,
      verified: false,
      sourceId: base.sourceId,
    };
    expect(effectiveSource(scenario, sources)).toBe("prepwise");
    expect(effectiveSource({ ...scenario, verified: true }, sources)).toBe("official");
  });

  it("resolves against the bundled register by default", () => {
    const id = SOURCES.find((source) => source.kind === "official")?.id;
    expect(effectiveSource({ ...base, sourceId: id as PlanItem["sourceId"] })).toBe("official");
    expect(effectiveSource({ ...base, sourceId: "missing" as PlanItem["sourceId"] })).toBe(
      "prepwise",
    );
  });
});

describe("plan messages", () => {
  const fmt = (n: number) => t("units.l", { count: n });

  it("formats units with Polish plurals and the decimal comma", () => {
    expect(fmt(27)).toBe("27 l");
    expect(fmt(4.5)).toBe("4,5 l");
    expect([1, 2, 5, 22, 4.5].map((count) => t("units.portion", { count }))).toEqual([
      "1 porcja",
      "2 porcje",
      "5 porcji",
      "22 porcje",
      "4,5 porcji",
    ]);
    expect(t("units.day", { count: 3 })).toBe("na 3 dni");
    expect(t("units.set", { count: 1 })).toBe("1 zestaw");
  });

  it("renders a per-day formula", () => {
    expect(
      t("formula.perDay", { amount: fmt(3), who: t("formula.people", { count: 3 }), days: 3 }),
    ).toBe("3 l × 3 osoby × 3 dni");
    expect(
      t("formula.perDay", { amount: fmt(0.5), who: t("formula.animals", { count: 1 }), days: 3 }),
    ).toBe("0,5 l × 1 zwierzę × 3 dni");
  });

  it("renders the medicines reminder for 3, 7 and 14 days", () => {
    expect([3, 7, 14].map((days) => t("formula.dose", { days }))).toEqual([
      "Wasza dawka × 3 dni — sprawdźcie zapas",
      "Wasza dawka × 7 dni — sprawdźcie zapas",
      "Wasza dawka × 14 dni — sprawdźcie zapas",
    ]);
  });

  it("names the pet section and pet items by kind", () => {
    expect(t("sections.pets", { kind: "dog" })).toBe("Dla psa");
    expect(t("sections.pets", { kind: "animals" })).toBe("Dla zwierząt");
    expect(t("items.pet-water.name", { kind: "animals" })).toBe("Woda dla zwierząt");
  });
});
