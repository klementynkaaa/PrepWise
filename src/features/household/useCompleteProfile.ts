"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { localePath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/routing";
import { firstUnfinishedStep, type Household, type Tick } from "@/lib/household";
import { targetHref } from "./paths";
import { useHousehold } from "./useHousehold";

export type CompleteProfile =
  | { status: "unavailable" }
  /** Storage is being read, or a redirect to an unfinished step is under way. */
  | { status: "held" }
  | {
      status: "ready";
      household: Household;
      ticks: Tick[];
      /** Ids of the emergencies the household added to its plan. */
      emergencies: string[];
      planCreated: boolean;
      listCreated: boolean;
    };

/**
 * For screens that need a finished profile (overview, plan). An unfinished
 * one continues at its first unfinished step, and nothing saved opens the
 * intro (client side: a static export has no server to redirect).
 */
export function useCompleteProfile(locale: AppLocale): CompleteProfile {
  const { status, household, ticks, emergencies, planCreated, listCreated } = useHousehold();
  const router = useRouter();

  const incomplete = status === "ready" && household?.status !== "complete";
  const resumeAt = household
    ? targetHref(firstUnfinishedStep(household), locale)
    : localePath("/start", locale);

  useEffect(() => {
    if (incomplete) router.replace(resumeAt);
  }, [incomplete, resumeAt, router]);

  if (status === "unavailable") return { status: "unavailable" };
  if (status === "loading" || !household || incomplete) return { status: "held" };
  return { status: "ready", household, ticks, emergencies, planCreated, listCreated };
}
