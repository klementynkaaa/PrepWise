import { localePath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/routing";
import { stepsFor, type HouseholdAnswers, type Step, type StepTarget } from "@/lib/household";

const stepPaths: Record<StepTarget, string> = {
  people: "/start/people",
  pets: "/start/pets",
  housing: "/start/housing",
  needs: "/start/needs",
  overview: "/household",
};

/** The URL of a step or the overview. */
export function targetHref(target: StepTarget, locale: AppLocale): string {
  return localePath(stepPaths[target], locale);
}

const appPaths = { home: "/home", plan: "/plan" } as const;

/** The URL of an app screen after the profile: Start (`home`) or the plan. */
export function appHref(name: keyof typeof appPaths, locale: AppLocale): string {
  return localePath(appPaths[name], locale);
}

/**
 * Where the back link of a step leads: the previous step, the intro for the
 * first step, or the overview while editing a finished profile.
 */
export function backHref(
  step: Step,
  answers: HouseholdAnswers,
  status: string | undefined,
  locale: AppLocale,
) {
  if (status === "complete") return targetHref("overview", locale);
  const steps = stepsFor(answers);
  const previous = steps[steps.indexOf(step) - 1];
  return previous ? targetHref(previous, locale) : localePath("/start", locale);
}
