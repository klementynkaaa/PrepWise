"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AppHeader, PageShell } from "@/components/ui";
import type { AppLocale } from "@/i18n/routing";
import { AppTabs } from "./AppTabs";
import { useOnline } from "./useOnline";

/** The app screens' frame (Start, Plan): logo and Online/Offline chip, the screen, then the tab bar. */
export function AppFrame({
  locale,
  connection = true,
  children,
}: {
  locale: AppLocale;
  /** Show the Online/Offline chip (left out on error screens, as drawn). */
  connection?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("connection");
  const online = useOnline();
  return (
    <>
      <AppHeader
        saveState={connection ? (online ? "saved" : "offline") : undefined}
        saveLabels={{ saved: t("online"), offline: t("offline") }}
      />
      <PageShell>{children}</PageShell>
      <AppTabs locale={locale} />
    </>
  );
}
