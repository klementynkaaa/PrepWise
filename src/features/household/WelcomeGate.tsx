"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { AppLocale } from "@/i18n/routing";
import { firstUnfinishedStep } from "@/lib/household";
import { HeldPage } from "./HeldPage";
import { targetHref } from "./paths";
import { useHousehold } from "./useHousehold";

/**
 * Wraps Welcome. A saved household skips it: a complete profile opens the
 * overview, an unfinished one continues at its first unfinished step. Nothing
 * saved, a damaged record or no storage shows Welcome. While storage is read a
 * neutral page is shown, so Welcome never flashes.
 */
export function WelcomeGate({ locale, children }: { locale: AppLocale; children: ReactNode }) {
  const { status, household } = useHousehold();
  const router = useRouter();
  const resumeAt =
    status === "ready" && household ? targetHref(firstUnfinishedStep(household), locale) : null;

  useEffect(() => {
    if (resumeAt) router.replace(resumeAt);
  }, [resumeAt, router]);

  if (status === "loading" || resumeAt) return <HeldPage />;
  return children;
}
