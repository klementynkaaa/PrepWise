"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Button,
  ButtonLink,
  Divider,
  EmptyState,
  PageBody,
  PageFooter,
  PageHeader,
  PageShell,
  PanelList,
  SaveStatus,
  SummaryRow,
} from "@/components/ui";
import { Generating } from "@/features/plan/Generating";
import { useOnline } from "@/features/shell/useOnline";
import { localePath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/routing";
import { summarise, type Household, type HouseholdSummary, type Step } from "@/lib/household";
import { knownEmergencies } from "@/lib/plan";
import { HeldPage } from "./HeldPage";
import { PEOPLE_GROUPS, PET_KINDS } from "./groups";
import { SaveError } from "./SaveError";
import { appHref, emergenciesHref, targetHref } from "./paths";
import { useCompleteProfile } from "./useCompleteProfile";
import { useHousehold } from "./useHousehold";

/** The saved profile, one row per step with a link to change it, and the way into the plan. */
export function Overview({ locale }: { locale: AppLocale }) {
  const profile = useCompleteProfile(locale);

  if (profile.status === "unavailable") return <StorageUnavailable locale={locale} />;
  if (profile.status === "held") return <HeldPage />;
  return (
    <OverviewScreen
      household={profile.household}
      emergencies={profile.emergencies}
      planCreated={profile.planCreated}
      locale={locale}
    />
  );
}

type Mode = "rows" | "generating" | "failed";

/**
 * The overview and, after "Stwórz plan", the generating screen in its place.
 * The flag write is the generating screen's last step; the plan opens only
 * after it resolves, and a failed write shows the save error here.
 */
function OverviewScreen({
  household,
  emergencies,
  planCreated,
  locale,
}: {
  household: Household;
  emergencies: string[];
  planCreated: boolean;
  locale: AppLocale;
}) {
  const { markPlanCreated } = useHousehold();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("rows");
  // A run starts once: a second tap before the screen swaps does nothing.
  const running = useRef(false);

  const start = () => {
    if (running.current) return;
    running.current = true;
    setMode("generating");
  };
  const stop = (next: Mode) => {
    running.current = false;
    setMode(next);
  };

  if (mode === "generating") {
    return (
      <Generating
        save={markPlanCreated}
        onSaved={() => router.push(appHref("plan", locale))}
        onFailed={() => stop("failed")}
      />
    );
  }
  if (mode === "failed") return <SaveError onRetry={start} onBack={() => stop("rows")} />;
  return (
    <OverviewRows
      household={household}
      emergencies={emergencies}
      planCreated={planCreated}
      locale={locale}
      onCreate={start}
    />
  );
}

function StorageUnavailable({ locale }: { locale: AppLocale }) {
  const t = useTranslations("overview.unavailable");
  return (
    <PageShell>
      <main className="flex flex-1 flex-col justify-center px-4 py-6">
        <EmptyState
          illustration="storage-error"
          headingLevel={1}
          title={t("title")}
          action={<ButtonLink href={localePath("/start", locale)}>{t("action")}</ButtonLink>}
        >
          {t("body")}
        </EmptyState>
      </main>
    </PageShell>
  );
}

function OverviewRows({
  household,
  emergencies,
  planCreated,
  locale,
  onCreate,
}: {
  household: Household;
  emergencies: string[];
  planCreated: boolean;
  locale: AppLocale;
  onCreate: () => void;
}) {
  const t = useTranslations("overview");
  const online = useOnline();
  const tAll = useTranslations();
  const names = knownEmergencies(emergencies).map((id) => tAll(`plan.emergencies.${id}.name`));
  const rows = overviewRows(summarise(household), t, names);

  return (
    <PageShell>
      <PageHeader title={t("title")} />
      <PageBody>
        <SaveStatus
          state={online ? "saved" : "offline"}
          labels={{ saved: t("status.saved"), offline: t("status.offline") }}
        />
        <PanelList>
          {rows.map((row, index) => (
            <div key={row.step}>
              {index > 0 && <Divider />}
              <SummaryRow
                label={row.label}
                value={row.value}
                action={{
                  href:
                    row.target === "emergencies"
                      ? emergenciesHref(locale)
                      : targetHref(row.target, locale),
                  label: t("change"),
                  ariaLabel: t("changeLabel", { row: row.label }),
                }}
              />
            </div>
          ))}
        </PanelList>
      </PageBody>
      <PageFooter>
        <p className="pb-1.5 text-center text-body-sm text-ink-muted">{t("cta.lead")}</p>
        {planCreated ? (
          <ButtonLink href={appHref("plan", locale)}>{t("cta.show")}</ButtonLink>
        ) : (
          <Button onClick={onCreate}>{t("cta.create")}</Button>
        )}
      </PageFooter>
    </PageShell>
  );
}

type Translator = ReturnType<typeof useTranslations<"overview">>;

/**
 * Turns the plain summary into the rows, with Polish plural forms. The last row,
 * "Sytuacje", lists the names of the chosen emergencies and leads to Plan's sheet.
 */
export function overviewRows(
  summary: HouseholdSummary,
  t: Translator,
  emergencyNames: readonly string[] = [],
): { step: Step | "emergencies"; target: Step | "emergencies"; label: string; value: string }[] {
  const none = t("none");

  const groups = PEOPLE_GROUPS.filter((group) => summary.people[group] > 0).map((group) =>
    t(`counts.${group}`, { count: summary.people[group] }),
  );
  const pets = PET_KINDS.filter((kind) => summary.pets[kind] > 0).map((kind) =>
    t(`counts.${kind}`, { count: summary.pets[kind] }),
  );

  return [
    {
      step: "people",
      target: "people",
      label: t("rows.people"),
      value: t("peopleLine", { groups: groups.join(", "), total: summary.peopleTotal }),
    },
    {
      step: "pets",
      // Without pets the step is skipped; the yes/no answer lives on the people step.
      target: summary.hasPets ? "pets" : "people",
      label: t("rows.pets"),
      value: pets.length > 0 ? pets.join(", ") : none,
    },
    {
      step: "housing",
      target: "housing",
      label: t("rows.housing"),
      value: summary.housingType ? t(`housing.${summary.housingType}`) : none,
    },
    {
      step: "needs",
      target: "needs",
      label: t("rows.needs"),
      value:
        summary.needs.length > 0
          ? summary.needs.map((need) => t(`needs.${need}`)).join(" · ")
          : none,
    },
    {
      step: "emergencies",
      target: "emergencies",
      label: t("rows.emergencies"),
      value: emergencyNames.length > 0 ? emergencyNames.join(", ") : t("noneEmergencies"),
    },
  ];
}
