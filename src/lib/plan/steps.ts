import type { PlanStage } from "./types";

export type StartStepId = "plan" | "supplies" | "backpack";
export type StartStepState = "done" | "current" | "later";

export type StartStep = { id: StartStepId; state: StartStepState };

/**
 * The steps "Do zrobienia" shows on Start, derived from the plan's stage.
 * The plan is always done. Home supplies are done once the list exists and
 * nothing at home is left to tick; the backpack step exists only when the
 * plan has a backpack, and is done once its own items are all ticked, even
 * while home supplies are not (`backpackLeft`, 0 when it is full), or once
 * everything is ticked (`complete`).
 * `current` is the 1-based number of the step in progress, or null when all
 * steps are done.
 */
export function startSteps(input: {
  stage: PlanStage;
  homeLeft: number;
  hasBackpack: boolean;
  backpackLeft?: number;
}): {
  steps: StartStep[];
  current: number | null;
} {
  const { stage, homeLeft, hasBackpack, backpackLeft } = input;
  const complete = stage === "complete";
  const suppliesDone = complete || (stage === "collecting" && homeLeft === 0);
  const done: Record<StartStepId, boolean> = {
    plan: true,
    supplies: suppliesDone,
    backpack: complete || (hasBackpack && stage === "collecting" && backpackLeft === 0),
  };
  const ids: StartStepId[] = hasBackpack ? ["plan", "supplies", "backpack"] : ["plan", "supplies"];
  const firstOpen = ids.findIndex((id) => !done[id]);
  const steps = ids.map((id, index): StartStep => ({
    id,
    state: done[id] ? "done" : index === firstOpen ? "current" : "later",
  }));
  return { steps, current: firstOpen === -1 ? null : firstOpen + 1 };
}
