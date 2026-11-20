import type { HouseholdSummary } from "@/lib/household/summary";
import type { PeopleGroup, PetKind } from "@/lib/household/types";
import { recommendedQuantity, roundUpToStep } from "@/lib/quantity";
import { PLAN_ITEMS, SOURCES } from "./content";
import {
  CATEGORIES,
  SECTIONS,
  TIERS,
  type CategoryId,
  type FormulaMember,
  type FormulaParts,
  type FormulaTerm,
  type MemberGroup,
  type PetSectionKind,
  type Plan,
  type PlanItem,
  type PlanRowData,
  type PlanSection,
  type PlanStage,
  type PlanTier,
  type RegisterSource,
  type SectionId,
  type Source,
  type SourceClaim,
  type TierLevel,
  type Trigger,
} from "./types";

const DOGS: readonly PetKind[] = ["smallDog", "mediumDog", "largeDog"];

/**
 * The source a row shows. "official" only when the item is meant to be
 * official, has been verified and its `sourceId` resolves to an official entry
 * in the register; every other item is "prepwise". Screens use this, never
 * `intendedSource`.
 */
export function effectiveSource(
  item: SourceClaim,
  sources: readonly RegisterSource[] = SOURCES,
): Source {
  if (item.intendedSource !== "official" || item.verified !== true) return "prepwise";
  const source = sources.find((entry) => entry.id === item.sourceId);
  return source?.kind === "official" ? "official" : "prepwise";
}

/**
 * The household's stage on Start: "collecting" once the shopping list
 * exists, "complete" once everything on it is ticked.
 */
export function planStage(plan: Plan, listCreated: boolean, allDone = false): PlanStage {
  void plan;
  if (!listCreated) return "ready";
  return allDone ? "complete" : "collecting";
}

function isPeopleGroup(group: MemberGroup): group is PeopleGroup {
  return (
    group === "adults" || group === "seniors" || group === "children" || group === "smallChildren"
  );
}

function countOf(summary: HouseholdSummary, group: MemberGroup): number {
  return isPeopleGroup(group) ? summary.people[group] : summary.pets[group];
}

function triggerHolds(summary: HouseholdSummary, when: Trigger | undefined): boolean {
  if (!when) return true;
  if ("hasPeople" in when) return summary.people[when.hasPeople] > 0;
  if ("hasPet" in when) {
    if (when.hasPet === "any") return summary.petsTotal > 0;
    if (when.hasPet === "dog") return DOGS.some((dog) => summary.pets[dog] > 0);
    return summary.pets[when.hasPet] > 0;
  }
  if ("need" in when) return summary.needs.includes(when.need);
  // The household cannot pick an emergency until S-03.
  if ("emergency" in when) return false;
  return summary.housingType === when.housing;
}

/** The groups present in the household, with their amount and count, in content order. */
function presentGroups(
  summary: HouseholdSummary,
  amounts: Partial<Record<MemberGroup, number>>,
): { group: MemberGroup; amount: number; count: number }[] {
  return (Object.entries(amounts) as [MemberGroup, number][])
    .map(([group, amount]) => ({ group, amount, count: countOf(summary, group) }))
    .filter(({ count }) => count > 0);
}

/**
 * Formula terms: groups that share an amount merge into one term ("3 l × 3
 * osoby"), so a split shows only where the amounts really differ.
 */
function formulaTerms(
  groups: { group: MemberGroup; amount: number; count: number }[],
): FormulaTerm[] {
  const byAmount = new Map<number, { group: MemberGroup; count: number }[]>();
  for (const { group, amount, count } of groups) {
    byAmount.set(amount, [...(byAmount.get(amount) ?? []), { group, count }]);
  }
  return [...byAmount.entries()].map(([amount, members]) => {
    const count = members.reduce((sum, m) => sum + m.count, 0);
    if (members.length === 1) return { who: members[0].group, count, amount };
    return { who: isPeopleGroup(members[0].group) ? "people" : "animals", count, amount };
  });
}

type Computed = { quantity: number; formula: FormulaParts };

/** Quantity and formula for one item, or null when nothing in the household needs it. */
function compute(item: PlanItem, summary: HouseholdSummary, days: number): Computed | null {
  const { amount } = item;
  if ("perDay" in amount) {
    const groups = presentGroups(summary, amount.perDay);
    if (groups.length === 0) return null;
    const raw = groups.reduce(
      (sum, { amount: a, count }) => sum + recommendedQuantity(a, count, days),
      0,
    );
    return {
      quantity: roundUpToStep(raw, item.roundStep),
      formula: { kind: "perDay", unit: item.unit, days, terms: formulaTerms(groups) },
    };
  }
  if ("perMember" in amount) {
    const groups = presentGroups(summary, amount.perMember);
    if (groups.length === 0) return null;
    const raw = groups.reduce(
      (sum, { amount: a, count }) => sum + recommendedQuantity(a, count, 1),
      0,
    );
    return {
      quantity: roundUpToStep(raw, item.roundStep),
      formula: { kind: "perMember", unit: item.unit, terms: formulaTerms(groups) },
    };
  }
  if ("fixed" in amount) {
    return {
      quantity: amount.fixed,
      formula: { kind: "fixed", amount: amount.fixed, unit: item.unit },
    };
  }
  if ("dose" in amount) {
    return { quantity: days, formula: { kind: "dose", days } };
  }
  const per = amount.forDays.per;
  const members: FormulaMember[] = (per ?? [])
    .map((who) => ({ who, count: countOf(summary, who) }))
    .filter(({ count }) => count > 0);
  if (per && members.length === 0) return null;
  return { quantity: days, formula: { kind: "forDays", days, members } };
}

function petSectionKind(summary: HouseholdSummary): PetSectionKind {
  const dogs = DOGS.reduce((sum, dog) => sum + summary.pets[dog], 0);
  return dogs === summary.petsTotal ? "dog" : "animals";
}

/**
 * Builds the plan for a household and a number of days, ordered by the
 * business rules: three tiers with category labels, then the member sections.
 * Empty categories, tiers and sections are left out. No text: screens format
 * every part with `plan.*` messages.
 */
export function buildPlan(
  summary: HouseholdSummary,
  days: number,
  items: readonly PlanItem[] = PLAN_ITEMS,
): Plan {
  if (!Number.isFinite(days) || days <= 0) {
    throw new RangeError("A plan needs a finite, positive number of days.");
  }
  const tierRows = new Map<TierLevel, Map<CategoryId, PlanRowData[]>>(
    TIERS.map((tier) => [tier, new Map()]),
  );
  const sectionRows = new Map<SectionId, PlanRowData[]>(SECTIONS.map((id) => [id, []]));
  const addToTier = (tier: TierLevel, category: CategoryId, row: PlanRowData) => {
    const categories = tierRows.get(tier)!;
    categories.set(category, [...(categories.get(category) ?? []), row]);
  };
  let itemCount = 0;

  for (const item of items) {
    if (!triggerHolds(summary, item.when)) continue;
    const computed = compute(item, summary, days);
    if (!computed) continue;
    const row: PlanRowData = {
      itemId: item.id,
      quantity: computed.quantity,
      unit: item.unit,
      formula: computed.formula,
      source: effectiveSource(item),
      first: item.first === true,
      ...(item.dietAware && summary.needs.includes("specialDiet") ? { diet: true as const } : {}),
    };
    itemCount += 1;

    const { placement } = item;
    if (placement.kind === "tier") {
      addToTier(placement.tier, placement.category, row);
      continue;
    }
    sectionRows
      .get(placement.section)!
      .push(placement.tier ? { ...row, tier: placement.tier } : row);
    if (item.pointerInTier1 && placement.section === "smallChild" && placement.category) {
      addToTier(1, placement.category, {
        ...row,
        formula: { kind: "pointer", section: "smallChild" },
        first: false,
        pointer: "smallChild",
      });
    }
  }

  const tiers: PlanTier[] = TIERS.map((tier) => {
    const categories = tierRows.get(tier)!;
    return {
      tier,
      categories: CATEGORIES.flatMap((id) => {
        const rows = categories.get(id) ?? [];
        return rows.length > 0 ? [{ id, rows }] : [];
      }),
    };
  }).filter((tier) => tier.categories.length > 0);

  const sections: PlanSection[] = SECTIONS.flatMap((id): PlanSection[] => {
    const rows = sectionRows.get(id)!;
    if (rows.length === 0) return [];
    return id === "pets" ? [{ id, petKind: petSectionKind(summary), rows }] : [{ id, rows }];
  });

  return { days, tiers, sections, itemCount };
}
