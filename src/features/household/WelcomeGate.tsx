"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { AppLocale } from "@/i18n/routing";
import { firstUnfinishedStep, type Household } from "@/lib/household";
import { HeldPage } from "./HeldPage";
import { appHref, targetHref } from "./paths";
import { useHousehold } from "./useHousehold";

/** Where a saved household resumes: Start once this device has a plan, else its next step. */
function resumeHref(household: Household, planCreated: boolean, locale: AppLocale): string {
  if (household.status === "complete" && planCreated) return appHref("home", locale);
  return targetHref(firstUnfinishedStep(household), locale);
}

/**
 * Wraps Welcome. A saved household skips it: with a plan created on this
 * device it opens Start, a complete profile without one opens the overview,
 * and an unfinished one continues at its first unfinished step. Nothing saved,
 * a damaged record or no storage shows Welcome. While storage is read a
 * neutral page is shown, so Welcome never flashes.
 */
export function WelcomeGate({ locale, children }: { locale: AppLocale; children: ReactNode }) {
  const { status, household, planCreated } = useHousehold();
  const router = useRouter();
  const resumeAt =
    status === "ready" && household ? resumeHref(household, planCreated, locale) : null;

  useEffect(() => {
    if (resumeAt) router.replace(resumeAt);
  }, [resumeAt, router]);

  if (status === "loading" || resumeAt) return <HeldPage />;
  return children;
}
