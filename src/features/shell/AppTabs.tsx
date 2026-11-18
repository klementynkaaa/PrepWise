"use client";

import { useTranslations } from "next-intl";
import { TabBar } from "@/components/ui";
import { localePath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/routing";

/** The app's main navigation, Start · Plan, on the app screens (not the profile flow). */
export function AppTabs({ locale }: { locale: AppLocale }) {
  const t = useTranslations("nav");
  return (
    <TabBar
      label={t("label")}
      items={[
        { href: localePath("/home", locale), label: t("start"), icon: "home" },
        { href: localePath("/plan", locale), label: t("plan"), icon: "plan" },
      ]}
    />
  );
}
