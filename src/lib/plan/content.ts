/**
 * Bundled plan content, generated from `knowledge/` by `npm run knowledge`.
 * Names, notes and units live in `messages/pl.knowledge.json` (`plan.items.<id>`).
 * This module only gives the generated data its types, so importers stay the same.
 */
import {
  EMERGENCIES as GENERATED_EMERGENCIES,
  PLAN_ITEMS as GENERATED_ITEMS,
  SOURCES as GENERATED_SOURCES,
} from "./content.generated";
import type { PlanItem, RegisterSource, Scenario } from "./types";

export const PLAN_ITEMS: readonly PlanItem[] = GENERATED_ITEMS;
export const SOURCES: readonly RegisterSource[] = GENERATED_SOURCES;
export const EMERGENCIES: readonly Scenario[] = GENERATED_EMERGENCIES;
