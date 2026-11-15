"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { AppLocale } from "@/i18n/routing";
import {
  emptyAnswers,
  firstUnfinishedStep,
  stepsFor,
  type HouseholdAnswers,
  type Household,
  type Step,
  type StepTarget,
} from "@/lib/household";
import { targetHref } from "./paths";
import { useHousehold } from "./useHousehold";

/**
 * Where a direct visit to `step` must go instead, or null when the step may
 * open: every earlier step is done, and pets only exist when there are pets.
 */
export function redirectFor(step: Step, answers: HouseholdAnswers): StepTarget | null {
  const steps = stepsFor(answers);
  const index = steps.indexOf(step);
  if (index === -1) {
    return answers.completedSteps.includes("people") ? "housing" : "people";
  }
  const earlierDone = steps.slice(0, index).every((s) => answers.completedSteps.includes(s));
  return earlierDone ? null : firstUnfinishedStep(answers);
}

export type StepAccess =
  { held: true } | { held: false; household: Household | null; answers: HouseholdAnswers };

/**
 * Holds the screen until storage is read and redirects (client side, a static
 * export has no server) when an earlier step is unfinished. When storage is
 * unavailable nothing can be saved, so the form opens empty instead.
 */
export function useStepAccess(step: Step, locale: AppLocale): StepAccess {
  const { status, household } = useHousehold();
  const router = useRouter();
  const answers = household ?? emptyAnswers();
  const redirect = status === "ready" ? redirectFor(step, answers) : null;

  useEffect(() => {
    if (redirect) router.replace(targetHref(redirect, locale));
  }, [redirect, router, locale]);

  if (status === "loading" || redirect) return { held: true };
  return { held: false, household, answers };
}
