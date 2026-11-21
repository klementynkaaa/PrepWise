/**
 * Plan content and plan shape. Plain data only: every word a screen shows is
 * looked up in the messages (`plan.*`, merged from `messages/pl.json` and the generated
 * `messages/pl.knowledge.json`) by the ids and slugs below.
 */
import type { EmergencyId, SourceId } from "./content.generated";
import type { HousingType, Need, PeopleGroup, PetKind } from "@/lib/household/types";

export const TIERS = [1, 2, 3] as const;
export type TierLevel = (typeof TIERS)[number];

/** Category labels inside the tier panels, in display order. */
export const CATEGORIES = [
  "waterFood",
  "medicine",
  "light",
  "communication",
  "hygiene",
  "warmth",
  "mobility",
  "documents",
  "tools",
] as const;
export type CategoryId = (typeof CATEGORIES)[number];

/** Member-specific sections shown after the three tiers, in display order. */
export const SECTIONS = ["smallChild", "pets"] as const;
export type SectionId = (typeof SECTIONS)[number];

/** "dog" when the only pets are dogs ("Dla psa"), otherwise "animals" ("Dla zwierząt"). */
export type PetSectionKind = "dog" | "animals";

/**
 * Units of a quantity. "day" marks a supply sized "for N days" with no number
 * of its own (medicines, small-child food, pet food): its quantity is the days.
 */
export const UNITS = ["l", "portion", "piece", "pack", "set", "roll", "day"] as const;
export type Unit = (typeof UNITS)[number];

/** A member group an amount can be given for: a people group or a pet kind. */
export type MemberGroup = PeopleGroup | PetKind;

export type Placement =
  | { kind: "tier"; tier: TierLevel; category: CategoryId }
  | {
      kind: "section";
      section: SectionId;
      /** Small-child items keep their tier; pet items have none. */
      tier?: TierLevel;
      /** Tier-1 category that holds the pointer row (needed with `pointerInTier1`). */
      category?: CategoryId;
    };

export type Amount =
  /** A daily amount per group or pet kind, multiplied by the count and the days. */
  | { perDay: Partial<Record<MemberGroup, number>> }
  /** An amount per member, independent of the days (a torch each, a blanket each). */
  | { perMember: Partial<Record<MemberGroup, number>> }
  /** A set number regardless of household size. */
  | { fixed: number }
  /** The medicines reminder: the household's own dose for the days. Never a calculated dose. */
  | { dose: true }
  /**
   * A supply "for N days" with no number of its own. `per` lists the groups the
   * formula names; when given and none of them is present, the item is left out.
   */
  | { forDays: { per?: MemberGroup[] } };

export type Trigger =
  | { hasPeople: PeopleGroup }
  | { hasPet: PetKind | "dog" | "any" }
  | { need: Need }
  | { housing: HousingType }
  /** An emergency scenario the household picked. Never holds until S-03 lets them pick one. */
  | { emergency: EmergencyId };

export type Source = "official" | "prepwise";

export type PlanItem = {
  /** Permanent kebab-case slug. Never renamed or reused: ticks (S-06) point at it. */
  id: string;
  placement: Placement;
  unit: Unit;
  amount: Amount;
  /** Quantities round up to a multiple of this step (1 for whole units, 0.5 for pet water). */
  roundStep: number;
  /** Included only when the trigger holds; always included when absent. */
  when?: Trigger;
  /** What the figure is meant to be once verified. Screens never read it: see `effectiveSource`. */
  intendedSource: Source;
  /**
   * True only when the figure's evidence is complete and owner-verified in
   * `knowledge/` (derived by the generator, never written by hand).
   */
  verified: boolean;
  /** The register source the figure was verified against (set with `verified`). */
  sourceId?: SourceId;
  /** The "Najpierw" row (water only). */
  first?: true;
  /** Small-child food: also shows a pointer row in tier 1. */
  pointerInTier1?: true;
  /** The row says "zgodne z dietą" when the household has a special diet. */
  dietAware?: true;
};

/** What decides a figure's label: see `effectiveSource`. Items and scenarios both carry it. */
export type SourceClaim = {
  intendedSource: Source;
  verified: boolean;
  sourceId?: SourceId;
};

/** An emergency scenario (`knowledge/emergencies.json`): the items it adds to the baseline. */
export type Scenario = SourceClaim & {
  /** Permanent kebab-case slug. */
  id: string;
  /** Slugs of the items it adds; each has `when: { emergency: id }`. */
  items: readonly string[];
};

/** A source in the bundled register (`knowledge/sources.json`). Its Polish title and publisher are messages. */
export type RegisterSource = {
  id: string;
  kind: "official" | "other";
  url: string;
  /** Wayback copy of the page; required once an owner-verified figure cites the source. */
  archivedUrl?: string;
  /** Free text, e.g. the edition of a publication. */
  edition?: string;
};

/** Who a formula term counts: one group, or several groups sharing the same amount. */
export type FormulaWho = MemberGroup | "people" | "animals";

export type FormulaTerm = { who: FormulaWho; count: number; amount: number };
export type FormulaMember = { who: MemberGroup; count: number };

/**
 * Structured formula parts. Screens format them with `plan.formula.*` messages,
 * e.g. perDay with one term → "3 l × 3 osoby × 3 dni".
 */
export type FormulaParts =
  | { kind: "perDay"; unit: Unit; days: number; terms: FormulaTerm[] }
  | { kind: "perMember"; unit: Unit; terms: FormulaTerm[] }
  | { kind: "fixed"; amount: number; unit: Unit }
  | { kind: "dose"; days: number }
  | { kind: "forDays"; days: number; members: FormulaMember[] }
  | { kind: "pointer"; section: "smallChild" };

export type PlanRowData = {
  itemId: string;
  quantity: number;
  unit: Unit;
  formula: FormulaParts;
  source: Source;
  first: boolean;
  /** A pointer row in tier 1 that leads to the item in its section. Not counted as an item. */
  pointer?: "smallChild";
  /** The food row when the household has a special diet ("zgodne z dietą"). */
  diet?: true;
  /** The item's tier, on section rows that keep one ("priorytet 1"). */
  tier?: TierLevel;
};

export type PlanCategory = { id: CategoryId; rows: PlanRowData[] };
export type PlanTier = { tier: TierLevel; categories: PlanCategory[] };

export type PlanSection =
  | { id: "smallChild"; rows: PlanRowData[] }
  | { id: "pets"; petKind: PetSectionKind; rows: PlanRowData[] };

export type Plan = {
  days: number;
  tiers: PlanTier[];
  sections: PlanSection[];
  /** Real items only; pointer rows are not counted. */
  itemCount: number;
};

/**
 * The household's stage on Start: the plan is ready, or, once the shopping
 * list exists, the household is collecting supplies.
 */
export type PlanStage = "ready" | "collecting" | "complete";
