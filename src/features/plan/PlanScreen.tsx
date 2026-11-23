"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Banner, PageHeader, Skeleton, SkeletonGroup, TextButton } from "@/components/ui";
import { useCompleteProfile } from "@/features/household/useCompleteProfile";
import { AppFrame } from "@/features/shell/AppFrame";
import { AppUnavailable } from "@/features/shell/AppUnavailable";
import type { AppLocale } from "@/i18n/routing";
import { summarise, type Household, type Tick } from "@/lib/household";
import { buildList } from "@/lib/list";
import { buildPlan, knownEmergencies } from "@/lib/plan";
import { householdLine, itemArgs, PLAN_DAYS, usePlanTranslator } from "./format";
import { EmergenciesPanel } from "./EmergenciesPanel";
import { EmergenciesSheet } from "./EmergenciesSheet";
import { CreateListPanel, ListProgressPanel } from "./ListPanel";
import { SectionPanel, TierPanel, type RowContext } from "./PlanTiers";
import { SourcesSheet } from "./SourcesSheet";

/**
 * The plan, derived from the stored profile and the bundled content every
 * time it opens, so profile edits flow in without a new "generate". Opening
 * it never writes the plan flag.
 */
export function PlanScreen({ locale }: { locale: AppLocale }) {
  const profile = useCompleteProfile(locale);

  if (profile.status === "unavailable") return <PlanUnavailable locale={locale} />;
  if (profile.status === "held") return <PlanLoading locale={locale} />;
  return (
    <PlanReady
      household={profile.household}
      ticks={profile.ticks}
      emergencies={profile.emergencies}
      listCreated={profile.listCreated}
      locale={locale}
    />
  );
}

function PlanLoading({ locale }: { locale: AppLocale }) {
  const t = useTranslations();
  return (
    <AppFrame locale={locale}>
      {/* Busy until the plan shows, like the held page, so nothing reads the placeholders.
          The title sits inside <main> so it isn't a second banner under AppHeader. */}
      <main aria-busy="true" className="flex flex-1 flex-col">
        <PageHeader title={t("plan.title")} />
        <SkeletonGroup label={t("common.loading")} busy={false} className="flex-1 px-4 pt-4 pb-6">
          <Skeleton shape="banner" />
          <Skeleton className="w-1/2" />
          <Skeleton shape="block" />
          <Skeleton shape="block" />
          <Skeleton shape="block" />
        </SkeletonGroup>
      </main>
    </AppFrame>
  );
}

function PlanUnavailable({ locale }: { locale: AppLocale }) {
  const t = useTranslations("plan.unavailable");
  return <AppUnavailable locale={locale} title={t("title")} retry={t("retry")} />;
}

function PlanReady({
  household,
  ticks,
  emergencies,
  listCreated,
  locale,
}: {
  household: Household;
  ticks: Tick[];
  emergencies: string[];
  listCreated: boolean;
  locale: AppLocale;
}) {
  const t = usePlanTranslator();
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const sourcesOpener = useRef<HTMLButtonElement>(null);
  const closeSources = () => {
    setSourcesOpen(false);
    // The native dialog hands focus back to its opener; this keeps it there
    // where that isn't implemented (e.g. older engines, jsdom).
    sourcesOpener.current?.focus();
  };

  const [sheetOpen, setSheetOpen] = useState(false);
  // How many items the last save added: shown once, until the sheet is opened again.
  const [added, setAdded] = useState<number | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const openSheet = () => {
    setAdded(null);
    setSheetOpen(true);
  };
  const closeSheet = () => {
    restoreFocus.current = true;
    setSheetOpen(false);
  };
  // Focus goes back to the panel's button once the sheet is closed and the panel shows what was
  // saved (the button changes between "Dodaj sytuację" and "Zmień").
  useEffect(() => {
    if (sheetOpen || !restoreFocus.current) return;
    restoreFocus.current = false;
    panel.current?.querySelector("button")?.focus();
  }, [sheetOpen, emergencies]);

  // "#sytuacje" (the overview's "Zmień") opens the sheet and is cleared at once, so closing the
  // sheet and going back, or reloading, does not open it again. This component only exists once
  // the household is read and complete, so a hash seen while it loads is still there to act on.
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash !== "#sytuacje") return;
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setAdded(null);
      setSheetOpen(true);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  const summary = useMemo(() => summarise(household), [household]);
  const chosen = useMemo(() => knownEmergencies(emergencies), [emergencies]);
  const plan = useMemo(() => buildPlan(summary, PLAN_DAYS, chosen), [summary, chosen]);
  // The panel's count comes from the list itself, so Plan, the list and Start agree.
  const shopping = useMemo(() => buildList(plan, ticks), [plan, ticks]);
  const list = useMemo(
    () => new Intl.ListFormat(locale, { style: "long", type: "conjunction" }),
    [locale],
  );
  const ctx: RowContext = { t, args: itemArgs(summary, plan), list };

  return (
    <AppFrame locale={locale}>
      {/* The title sits inside <main> so it isn't a second banner under AppHeader;
          the inner column keeps PageBody's spacing. */}
      <main className="flex flex-1 flex-col">
        <PageHeader title={t("plan.title")} />
        <div className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
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
              <TextButton
                ref={sourcesOpener}
                aria-haspopup="dialog"
                onClick={() => setSourcesOpen(true)}
              >
                {t("plan.sources.open")}
              </TextButton>
            </div>
          </div>
          <EmergenciesPanel ref={panel} t={t} chosen={chosen} added={added} onOpen={openSheet} />
          {plan.tiers.map((tier) => (
            <TierPanel key={tier.tier} tier={tier} ctx={ctx} />
          ))}
          {plan.sections.map((section) => (
            <SectionPanel key={section.id} section={section} ctx={ctx} />
          ))}
          {listCreated ? (
            <ListProgressPanel t={t} locale={locale} shopping={shopping} />
          ) : (
            <CreateListPanel t={t} locale={locale} itemCount={plan.itemCount} />
          )}
        </div>
      </main>
      <SourcesSheet open={sourcesOpen} onClose={closeSources} />
      <EmergenciesSheet
        t={t}
        open={sheetOpen}
        onClose={closeSheet}
        onSaved={(count) => {
          setAdded(count);
          closeSheet();
        }}
        summary={summary}
        saved={chosen}
      />
    </AppFrame>
  );
}
