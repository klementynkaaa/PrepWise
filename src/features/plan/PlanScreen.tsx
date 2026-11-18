"use client";

import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  AppHeader,
  Banner,
  Button,
  EmptyState,
  PageBody,
  PageHeader,
  PageShell,
  Skeleton,
  SkeletonGroup,
} from "@/components/ui";
import { useCompleteProfile } from "@/features/household/useCompleteProfile";
import { AppTabs } from "@/features/shell/AppTabs";
import { useOnline } from "@/features/shell/useOnline";
import type { AppLocale } from "@/i18n/routing";
import { summarise, type Household } from "@/lib/household";
import { buildPlan } from "@/lib/plan";
import { householdLine, itemArgs, usePlanTranslator } from "./format";
import { SectionPanel, TierPanel, type RowContext } from "./PlanTiers";
import { SourcesSheet } from "./SourcesSheet";

/** The 72-hour plan: S-02 has one length. */
const PLAN_DAYS = 3;

/**
 * The plan, derived from the stored profile and the bundled content every
 * time it opens, so profile edits flow in without a new "generate". Opening
 * it never writes the plan flag.
 */
export function PlanScreen({ locale }: { locale: AppLocale }) {
  const profile = useCompleteProfile(locale);

  if (profile.status === "unavailable") return <PlanUnavailable locale={locale} />;
  if (profile.status === "held") return <PlanLoading locale={locale} />;
  return <PlanReady household={profile.household} locale={locale} />;
}

/** Logo and Online/Offline chip, the screen, then the tab bar. */
function PlanFrame({
  locale,
  connection = true,
  children,
}: {
  locale: AppLocale;
  /** Show the Online/Offline chip (left out on the error screen, as drawn). */
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

function PlanLoading({ locale }: { locale: AppLocale }) {
  const t = useTranslations();
  return (
    <PlanFrame locale={locale}>
      <PageHeader title={t("plan.title")} />
      {/* Busy until the plan shows, like the held page, so nothing reads the placeholders. */}
      <main aria-busy="true" className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
        <SkeletonGroup label={t("common.loading")}>
          <Skeleton shape="banner" />
          <Skeleton className="w-1/2" />
          <Skeleton shape="block" />
          <Skeleton shape="block" />
          <Skeleton shape="block" />
        </SkeletonGroup>
      </main>
    </PlanFrame>
  );
}

function PlanUnavailable({ locale }: { locale: AppLocale }) {
  const t = useTranslations("plan.unavailable");
  return (
    <PlanFrame locale={locale} connection={false}>
      <main className="flex flex-1 flex-col justify-center px-4 py-6">
        <EmptyState
          illustration="storage-error"
          headingLevel={1}
          title={t("title")}
          action={<Button onClick={() => window.location.reload()}>{t("retry")}</Button>}
        >
          {t("body")}
        </EmptyState>
      </main>
    </PlanFrame>
  );
}

function PlanReady({ household, locale }: { household: Household; locale: AppLocale }) {
  const t = usePlanTranslator();
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const sourcesOpener = useRef<HTMLButtonElement>(null);
  const closeSources = () => {
    setSourcesOpen(false);
    // The native dialog hands focus back to its opener; this keeps it there
    // where that isn't implemented (e.g. older engines, jsdom).
    sourcesOpener.current?.focus();
  };

  const summary = useMemo(() => summarise(household), [household]);
  const plan = useMemo(() => buildPlan(summary, PLAN_DAYS), [summary]);
  const list = useMemo(
    () => new Intl.ListFormat(locale, { style: "long", type: "conjunction" }),
    [locale],
  );
  const ctx: RowContext = { t, args: itemArgs(summary, plan), list };

  return (
    <PlanFrame locale={locale}>
      <PageHeader title={t("plan.title")} />
      <PageBody>
        <div className="flex flex-col gap-1.5">
          <Banner
            illustration="banner-plan-ready"
            titleAs="h2"
            title={t("plan.banner.title", { hours: plan.days * 24 })}
          >
            {householdLine(t, summary, list)}
          </Banner>
          <div className="flex flex-wrap items-center justify-between gap-x-3 px-1">
            <p className="text-body-sm text-ink-muted">
              {t("plan.count", {
                items: plan.itemCount,
                tiers: plan.tiers.length,
                sections: plan.sections.length,
              })}
            </p>
            <button
              ref={sourcesOpener}
              type="button"
              aria-haspopup="dialog"
              onClick={() => setSourcesOpen(true)}
              className="inline-flex min-h-touch items-center text-body-strong text-accent"
            >
              {t("plan.sources.open")}
            </button>
          </div>
        </div>
        {plan.tiers.map((tier) => (
          <TierPanel key={tier.tier} tier={tier} ctx={ctx} />
        ))}
        {plan.sections.map((section) => (
          <SectionPanel key={section.id} section={section} ctx={ctx} />
        ))}
      </PageBody>
      <SourcesSheet open={sourcesOpen} onClose={closeSources} />
    </PlanFrame>
  );
}
