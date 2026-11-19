"use client";

import { useTranslations } from "next-intl";
import { TabBar } from "@/components/ui";
import { appHref } from "@/features/household/paths";
import type { AppLocale } from "@/i18n/routing";

/** The app's main navigation, Start · Plan · Lista, on the app screens (not the profile flow). */
export function AppTabs({ locale }: { locale: AppLocale }) {
  const t = useTranslations("nav");
  return (
    <TabBar
      label={t("label")}
      items={[
        { href: appHref("home", locale), label: t("start"), icon: "home" },
        { href: appHref("plan", locale), label: t("plan"), icon: "plan" },
        { href: appHref("list", locale), label: t("list"), icon: "list" },
      ]}
    />
  );
}
