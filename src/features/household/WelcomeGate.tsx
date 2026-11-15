"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { AppLocale } from "@/i18n/routing";
import { HeldPage } from "./HeldPage";
import { targetHref } from "./paths";
import { useHousehold } from "./useHousehold";

/**
 * Wraps Welcome. A complete profile skips it and opens the overview; anything
 * else (nothing saved, a draft, a damaged record, no storage) shows Welcome.
 * While storage is read a neutral page is shown, so Welcome never flashes.
 */
export function WelcomeGate({ locale, children }: { locale: AppLocale; children: ReactNode }) {
  const { status, household } = useHousehold();
  const router = useRouter();
  const complete = status === "ready" && household?.status === "complete";

  useEffect(() => {
    if (complete) router.replace(targetHref("overview", locale));
  }, [complete, router, locale]);

  if (status === "loading" || complete) return <HeldPage />;
  return children;
}
