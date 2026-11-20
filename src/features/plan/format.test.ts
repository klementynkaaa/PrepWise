import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { messages } from "@/i18n/messages";
import { PEOPLE_GROUPS, PET_KINDS } from "@/features/household/groups";
import type { HouseholdSummary } from "@/lib/household";
import { UNITS, type FormulaParts, type FormulaWho } from "@/lib/plan";
import { formatAmount, formatFormula, householdLine, type Translator } from "./format";

// The plan screens look keys up at runtime (see `Translator`), so TypeScript
// can't check them. This formats every key shape they build: a missing key throws.
const t = createTranslator({
  locale: "pl",
  messages,
  onError: (error) => {
    throw error;
  },
}) as unknown as Translator;
const list = new Intl.ListFormat("pl", { style: "long", type: "conjunction" });

const WHO: FormulaWho[] = [...PEOPLE_GROUPS, ...PET_KINDS, "people", "animals"];

describe("plan formatting covers every key it builds", () => {
  it.each(UNITS)("formats the unit %s for 1, 2, 5 and 4,5", (unit) => {
    for (const count of [1, 2, 5, 4.5]) {
      expect(formatAmount(t, unit, count)).not.toMatch(/plan\.|\{/);
    }
  });

  it.each(WHO)("formats a per-day and a for-days term for %s", (who) => {
    const perDay: FormulaParts = {
      kind: "perDay",
      unit: "l",
      days: 3,
      terms: [{ who, count: 2, amount: 1.5 }],
    };
    expect(formatFormula(t, perDay, list)).toMatch(/× 3 dni$/);
    if (who !== "people" && who !== "animals") {
      const forDays: FormulaParts = {
        kind: "forDays",
        days: 3,
        members: [{ who, count: 1 }],
      };
      expect(formatFormula(t, forDays, list)).not.toMatch(/overview\.|plan\.|\{/);
    }
  });

  it("formats every formula kind", () => {
    const kinds: FormulaParts[] = [
      {
        kind: "perDay",
        unit: "l",
        days: 3,
        terms: [
          { who: "adults", count: 2, amount: 3 },
          { who: "smallChildren", count: 1, amount: 1 },
        ],
      },
      { kind: "perMember", unit: "piece", terms: [{ who: "people", count: 3, amount: 1 }] },
      { kind: "fixed", amount: 1, unit: "set" },
      { kind: "dose", days: 3 },
      { kind: "forDays", days: 3, members: [] },
    ];
    for (const formula of kinds) {
      const text = formatFormula(t, formula, list);
      expect(text, formula.kind).toBeTruthy();
      expect(text, formula.kind).not.toMatch(/plan\.|\{/);
    }
    expect(formatFormula(t, { kind: "pointer", section: "smallChild" }, list)).toBeNull();
  });

  it("names every household member in the banner line", () => {
    const summary: HouseholdSummary = {
      people: { adults: 2, seniors: 1, children: 1, smallChildren: 1 },
      peopleTotal: 5,
      hasPets: true,
      pets: { smallDog: 1, mediumDog: 0, largeDog: 0, cat: 1, otherSmall: 1 },
      petsTotal: 3,
      housingType: "flat",
      needs: [],
    };
    expect(householdLine(t, summary, list)).not.toMatch(/plan\.|\{/);
  });
});
