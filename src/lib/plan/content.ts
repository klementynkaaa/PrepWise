/**
 * Bundled plan content: one list of supply items, in display order within each
 * category and section. Names, notes and units live in `messages/pl.json`
 * (`plan.items.<id>`), never here.
 *
 * DRAFT: every figure is illustrative and unverified until PRD Open Question 2
 * is answered, so every item is `verified: false` and shows as a PREPWISE
 * recommendation, whatever its `intendedSource`.
 */
import type { MemberGroup, PlanItem } from "./types";

/** Every people group, with the same amount. */
const everyone = (amount: number): Partial<Record<MemberGroup, number>> => ({
  adults: amount,
  seniors: amount,
  children: amount,
  smallChildren: amount,
});

const draft = { verified: false } as const;

export const PLAN_ITEMS: readonly PlanItem[] = [
  // Tier 1 · water and food
  {
    id: "drinking-water",
    placement: { kind: "tier", tier: 1, category: "waterFood" },
    unit: "l",
    amount: { perDay: everyone(3) },
    roundStep: 1,
    intendedSource: "official",
    ...draft,
    first: true,
  },
  {
    id: "shelf-stable-food",
    placement: { kind: "tier", tier: 1, category: "waterFood" },
    unit: "portion",
    // Small children have their own food in the "smallChild" section.
    amount: { perDay: { adults: 3, seniors: 3, children: 3 } },
    roundStep: 1,
    intendedSource: "prepwise",
    ...draft,
    dietAware: true,
  },
  // Tier 1 · medicines and first aid
  {
    id: "regular-medicines",
    placement: { kind: "tier", tier: 1, category: "medicine" },
    unit: "day",
    amount: { dose: true },
    roundStep: 1,
    when: { need: "regularMedicines" },
    intendedSource: "prepwise",
    ...draft,
  },
  {
    id: "medical-equipment-power",
    placement: { kind: "tier", tier: 1, category: "medicine" },
    unit: "day",
    amount: { forDays: {} },
    roundStep: 1,
    when: { need: "medicalEquipment" },
    intendedSource: "prepwise",
    ...draft,
  },
  {
    id: "first-aid-kit",
    placement: { kind: "tier", tier: 1, category: "medicine" },
    unit: "set",
    amount: { fixed: 1 },
    roundStep: 1,
    intendedSource: "official",
    ...draft,
  },
  // Tier 2 · light
  {
    id: "flashlight",
    placement: { kind: "tier", tier: 2, category: "light" },
    unit: "piece",
    amount: { perMember: { adults: 1, seniors: 1, children: 1 } },
    roundStep: 1,
    intendedSource: "prepwise",
    ...draft,
  },
  {
    id: "flashlight-batteries",
    placement: { kind: "tier", tier: 2, category: "light" },
    unit: "set",
    amount: { perMember: { adults: 1, seniors: 1, children: 1 } },
    roundStep: 1,
    intendedSource: "prepwise",
    ...draft,
  },
  // Tier 2 · communication
  {
    id: "battery-radio",
    placement: { kind: "tier", tier: 2, category: "communication" },
    unit: "piece",
    amount: { fixed: 1 },
    roundStep: 1,
    intendedSource: "official",
    ...draft,
  },
  {
    id: "power-bank",
    placement: { kind: "tier", tier: 2, category: "communication" },
    unit: "piece",
    amount: { fixed: 1 },
    roundStep: 1,
    intendedSource: "prepwise",
    ...draft,
  },
  // Tier 2 · hygiene
  {
    id: "toilet-paper",
    placement: { kind: "tier", tier: 2, category: "hygiene" },
    unit: "roll",
    amount: { perMember: everyone(1) },
    roundStep: 1,
    intendedSource: "prepwise",
    ...draft,
  },
  {
    id: "hand-hygiene",
    placement: { kind: "tier", tier: 2, category: "hygiene" },
    unit: "set",
    amount: { fixed: 1 },
    roundStep: 1,
    intendedSource: "prepwise",
    ...draft,
  },
  {
    id: "wet-wipes",
    placement: { kind: "tier", tier: 2, category: "hygiene" },
    unit: "pack",
    amount: { fixed: 2 },
    roundStep: 1,
    intendedSource: "prepwise",
    ...draft,
  },
  {
    // In a block of flats the water pumps stop without power.
    id: "flushing-water",
    placement: { kind: "tier", tier: 2, category: "hygiene" },
    unit: "l",
    amount: { perDay: everyone(5) },
    roundStep: 1,
    when: { housing: "flat" },
    intendedSource: "prepwise",
    ...draft,
  },
  // Tier 2 · warmth
  {
    id: "blanket",
    placement: { kind: "tier", tier: 2, category: "warmth" },
    unit: "piece",
    amount: { perMember: everyone(1) },
    roundStep: 1,
    intendedSource: "prepwise",
    ...draft,
  },
  {
    id: "heating-fuel",
    placement: { kind: "tier", tier: 2, category: "warmth" },
    unit: "day",
    amount: { forDays: {} },
    roundStep: 1,
    when: { housing: "house" },
    intendedSource: "prepwise",
    ...draft,
  },
  // Tier 2 · mobility
  {
    id: "mobility-aid-power",
    placement: { kind: "tier", tier: 2, category: "mobility" },
    unit: "set",
    amount: { fixed: 1 },
    roundStep: 1,
    when: { need: "limitedMobility" },
    intendedSource: "prepwise",
    ...draft,
  },
  // Tier 3 · documents and cash
  {
    id: "document-copies",
    placement: { kind: "tier", tier: 3, category: "documents" },
    unit: "set",
    amount: { fixed: 1 },
    roundStep: 1,
    intendedSource: "prepwise",
    ...draft,
  },
  {
    id: "cash",
    placement: { kind: "tier", tier: 3, category: "documents" },
    unit: "day",
    amount: { forDays: {} },
    roundStep: 1,
    intendedSource: "prepwise",
    ...draft,
  },
  // Tier 3 · tools
  {
    id: "multitool",
    placement: { kind: "tier", tier: 3, category: "tools" },
    unit: "piece",
    amount: { fixed: 1 },
    roundStep: 1,
    intendedSource: "prepwise",
    ...draft,
  },
  {
    id: "duct-tape",
    placement: { kind: "tier", tier: 3, category: "tools" },
    unit: "roll",
    amount: { fixed: 1 },
    roundStep: 1,
    intendedSource: "prepwise",
    ...draft,
  },
  // Section · small child (items keep their tier)
  {
    id: "small-child-food",
    placement: { kind: "section", section: "smallChild", tier: 1, category: "waterFood" },
    unit: "day",
    amount: { forDays: { per: ["smallChildren"] } },
    roundStep: 1,
    when: { hasPeople: "smallChildren" },
    intendedSource: "prepwise",
    ...draft,
    pointerInTier1: true,
  },
  {
    id: "diapers",
    placement: { kind: "section", section: "smallChild", tier: 2 },
    unit: "piece",
    amount: { perDay: { smallChildren: 6 } },
    roundStep: 1,
    when: { hasPeople: "smallChildren" },
    intendedSource: "prepwise",
    ...draft,
  },
  // Section · pets (no tier)
  {
    id: "pet-water",
    placement: { kind: "section", section: "pets" },
    unit: "l",
    amount: { perDay: { smallDog: 0.5, mediumDog: 1.5, largeDog: 2, cat: 0.3, otherSmall: 0.1 } },
    roundStep: 0.5,
    when: { hasPet: "any" },
    intendedSource: "prepwise",
    ...draft,
  },
  {
    id: "pet-food",
    placement: { kind: "section", section: "pets" },
    unit: "day",
    amount: { forDays: { per: ["smallDog", "mediumDog", "largeDog", "cat", "otherSmall"] } },
    roundStep: 1,
    when: { hasPet: "any" },
    intendedSource: "prepwise",
    ...draft,
  },
  {
    id: "pet-kit",
    placement: { kind: "section", section: "pets" },
    unit: "set",
    amount: { perMember: { smallDog: 1, mediumDog: 1, largeDog: 1, cat: 1, otherSmall: 1 } },
    roundStep: 1,
    when: { hasPet: "any" },
    intendedSource: "prepwise",
    ...draft,
  },
];
