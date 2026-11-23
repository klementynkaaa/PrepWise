import { useTranslations } from "next-intl";
import type { HouseholdSummary } from "@/lib/household";
import type {
  EmergencyId,
  FormulaParts,
  FormulaTerm,
  FormulaWho,
  PetSectionKind,
  Plan,
  PlanRowData,
  PlanTier,
  Unit,
} from "@/lib/plan";
import { PEOPLE_GROUPS } from "@/features/household/groups";

/** The 72-hour plan: S-02 has one length. */
export const PLAN_DAYS = 3;

/**
 * A translator over the whole dictionary (keys like "plan.units.l"). Plan keys
 * are built from content ids and slugs at runtime, which the typed keys can't
 * follow; `content.test.ts` and the screen tests check that they exist.
 */
export type Translator = {
  (key: string, values?: Record<string, string | number>): string;
  has(key: string): boolean;
};

/** The whole-dictionary translator for the plan screens. */
export function usePlanTranslator(): Translator {
  return useTranslations() as unknown as Translator;
}

/** What item names and notes may use: the pet section kind and the children for the first-aid note. */
export type ItemArgs = { kind: PetSectionKind; kids: "none" | "one" | "other" };

/** The arguments every item message gets, derived once per plan. */
export function itemArgs(summary: HouseholdSummary, plan: Plan): ItemArgs {
  const pets = plan.sections.find((section) => section.id === "pets");
  const kids = summary.people.children + summary.people.smallChildren;
  return {
    kind: pets?.id === "pets" ? pets.petKind : "dog",
    kids: kids === 0 ? "none" : kids === 1 ? "one" : "other",
  };
}

/** "27 l", "18 porcji", "na 3 dni": numbers get the Polish decimal comma from the plural rules. */
export function formatAmount(t: Translator, unit: Unit, count: number): string {
  return t(`plan.units.${unit}`, { count });
}

function formatWho(t: Translator, who: FormulaWho, count: number): string {
  if (who === "people") return t("plan.formula.people", { count });
  if (who === "animals") return t("plan.formula.animals", { count });
  return t(`overview.counts.${who}`, { count });
}

function formatTerm(t: Translator, unit: Unit, term: FormulaTerm): string {
  return t("plan.formula.term", {
    amount: formatAmount(t, unit, term.amount),
    who: formatWho(t, term.who, term.count),
  });
}

/** The working behind a quantity, e.g. "3 l × 3 osoby × 3 dni". Null for a pointer row. */
export function formatFormula(
  t: Translator,
  formula: FormulaParts,
  list: Intl.ListFormat,
): string | null {
  switch (formula.kind) {
    case "perDay": {
      const [only] = formula.terms;
      if (formula.terms.length === 1) {
        return t("plan.formula.perDay", {
          amount: formatAmount(t, formula.unit, only.amount),
          who: formatWho(t, only.who, only.count),
          days: formula.days,
        });
      }
      return t("plan.formula.perDayMixed", {
        terms: formula.terms
          .map((term) => formatTerm(t, formula.unit, term))
          .join(t("plan.formula.termJoin")),
        days: formula.days,
      });
    }
    case "perMember":
      return formula.terms
        .map((term) => formatTerm(t, formula.unit, term))
        .join(t("plan.formula.termJoin"));
    case "fixed":
      return t("plan.formula.perHousehold");
    case "dose":
      return t("plan.formula.dose", { days: formula.days });
    case "forDays":
      if (formula.members.length === 0) return t("plan.formula.perHousehold");
      return t("plan.formula.forDays", {
        who: list.format(formula.members.map((m) => formatWho(t, m.who, m.count))),
        days: formula.days,
      });
    case "pointer":
      return null;
  }
}

/**
 * The caption under a row: formula, the item's note, the diet reminder and,
 * on a section row that keeps one, its priority ("priorytet 1"). With
 * `withEmergencies` it ends with what added the row ("na brak prądu"); Plan
 * shows that as tags instead, the list in the caption.
 */
export function formatCaption(
  t: Translator,
  row: PlanRowData,
  args: ItemArgs,
  list: Intl.ListFormat,
  { withEmergencies = false }: { withEmergencies?: boolean } = {},
): string {
  const note = t.has(`plan.items.${row.itemId}.note`)
    ? t(`plan.items.${row.itemId}.note`, args)
    : null;
  return [
    formatFormula(t, row.formula, list),
    note,
    row.diet ? t("plan.formula.diet") : null,
    row.tier ? t("plan.formula.tier", { tier: row.tier }) : null,
    withEmergencies ? formatEmergenciesFor(t, row.emergencies, list) : null,
  ]
    .filter((part): part is string => part !== null && part !== "")
    .join(" · ");
}

/** "na brak prądu", "na powódź i ewakuację": what added a row, for a caption. Null when nothing did. */
export function formatEmergenciesFor(
  t: Translator,
  ids: readonly EmergencyId[] | undefined,
  list: Intl.ListFormat,
): string | null {
  if (!ids || ids.length === 0) return null;
  const names = list.format(ids.map((id) => t(`plan.emergencies.ui.accusative.${id}`)));
  return t("plan.emergencies.ui.captionFor", { names });
}

/** The names of the emergencies (nominative), for tags and summaries. */
export function emergencyNames(t: Translator, ids: readonly EmergencyId[]): string[] {
  return ids.map((id) => t(`plan.emergencies.${id}.name`));
}

/** Rows that count as items: pointer rows only lead to an item shown elsewhere. */
export function countItems(rows: readonly PlanRowData[]): number {
  return rows.filter((row) => !row.pointer).length;
}

/** Who is in the household, as the banners name them: dogs of every size count together. */
export type HouseholdMember =
  "adults" | "seniors" | "children" | "smallChildren" | "dogs" | "cats" | "otherSmall";

/** The household's members with their counts, in display order, leaving out the absent ones. */
export function householdMembers(summary: HouseholdSummary): [HouseholdMember, number][] {
  const dogs = summary.pets.smallDog + summary.pets.mediumDog + summary.pets.largeDog;
  const members: [HouseholdMember, number][] = [
    ...PEOPLE_GROUPS.map((group): [HouseholdMember, number] => [group, summary.people[group]]),
    ["dogs", dogs],
    ["cats", summary.pets.cat],
    ["otherSmall", summary.pets.otherSmall],
  ];
  return members.filter(([, count]) => count > 0);
}

/** "2 dorosłych, 1 małego dziecka i 1 psa": who the plan is for, in the genitive. */
export function householdWho(
  t: Translator,
  summary: HouseholdSummary,
  list: Intl.ListFormat,
): string {
  return list.format(
    householdMembers(summary).map(([key, count]) => t(`plan.household.${key}`, { count })),
  );
}

/** The plan banner's line, "Dla 2 dorosłych, 1 małego dziecka i 1 psa." */
export function householdLine(
  t: Translator,
  summary: HouseholdSummary,
  list: Intl.ListFormat,
): string {
  return t("plan.banner.line", { who: householdWho(t, summary, list) });
}

/** The items in a tier: its categories' rows, without pointer rows. */
export function tierItemCount(tier: PlanTier): number {
  return tier.categories.reduce((sum, category) => sum + countItems(category.rows), 0);
}
