"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  ButtonLink,
  Divider,
  EmptyState,
  PageBody,
  PageHeader,
  PageShell,
  PanelList,
  SaveStatus,
  SummaryRow,
} from "@/components/ui";
import { localePath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/routing";
import {
  firstUnfinishedStep,
  summarise,
  type Household,
  type HouseholdSummary,
  type Step,
} from "@/lib/household";
import { HeldPage } from "./HeldPage";
import { PEOPLE_GROUPS, PET_KINDS } from "./groups";
import { targetHref } from "./paths";
import { useHousehold } from "./useHousehold";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Online unless the browser says otherwise; prerendering assumes online. */
function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/** The saved profile, one row per step with a link to change it. */
export function Overview({ locale }: { locale: AppLocale }) {
  const { status, household } = useHousehold();
  const router = useRouter();

  // Nothing complete to show yet: continue at the first unfinished step.
  const incomplete = status === "ready" && household?.status !== "complete";
  const resumeAt = household
    ? targetHref(firstUnfinishedStep(household), locale)
    : localePath("/start", locale);

  useEffect(() => {
    if (incomplete) router.replace(resumeAt);
  }, [incomplete, resumeAt, router]);

  if (status === "unavailable") return <StorageUnavailable locale={locale} />;
  if (status === "loading" || !household || incomplete) return <HeldPage />;
  return <OverviewRows household={household} locale={locale} />;
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

function OverviewRows({ household, locale }: { household: Household; locale: AppLocale }) {
  const t = useTranslations("overview");
  const online = useOnline();
  const rows = overviewRows(summarise(household), t);

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
                  href: targetHref(row.target, locale),
                  label: t("change"),
                  ariaLabel: t("changeLabel", { row: row.label }),
                }}
              />
            </div>
          ))}
        </PanelList>
      </PageBody>
    </PageShell>
  );
}

type Translator = ReturnType<typeof useTranslations<"overview">>;

/** Turns the plain summary into the four rows, with Polish plural forms. */
export function overviewRows(
  summary: HouseholdSummary,
  t: Translator,
): { step: Step; target: Step; label: string; value: string }[] {
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
  ];
}
