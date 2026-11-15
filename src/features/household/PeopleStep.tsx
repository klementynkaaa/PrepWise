"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Panel, SegmentedControl, Stepper, StepPage } from "@/components/ui";
import type { AppLocale } from "@/i18n/routing";
import {
  MAX_COUNT,
  peopleTotal,
  stepPosition,
  type HouseholdAnswers,
  type Household,
  type PeopleCounts,
} from "@/lib/household";
import { HeldPage } from "./HeldPage";
import { PEOPLE_GROUPS } from "./groups";
import { backHref } from "./paths";
import { SaveError } from "./SaveError";
import { useStepAccess } from "./useStepAccess";
import { useStepSubmit } from "./useStepSubmit";

type PetsAnswer = "yes" | "no";

/** Step 1: how many people live in the home, and whether there are pets. */
export function PeopleStep({ locale }: { locale: AppLocale }) {
  const access = useStepAccess("people", locale);
  if (access.held) return <HeldPage />;
  return <PeopleForm locale={locale} household={access.household} answers={access.answers} />;
}

function PeopleForm({
  locale,
  household,
  answers,
}: {
  locale: AppLocale;
  household: Household | null;
  answers: HouseholdAnswers;
}) {
  const t = useTranslations("steps");
  const tc = useTranslations("common");
  const [people, setPeople] = useState<PeopleCounts>(answers.people);
  const [hasPets, setHasPets] = useState(answers.hasPets);
  const { failed, submit, retry, dismiss } = useStepSubmit("people", locale, household);

  if (failed) return <SaveError onRetry={retry} onBack={dismiss} />;

  const total = peopleTotal({ people });
  // The counter follows the pets answer as it changes: 4 steps with pets, 3 without.
  const position = stepPosition({ hasPets }, "people");

  return (
    <StepPage
      backHref={backHref("people", answers, household?.status, locale)}
      backLabel={tc("back")}
      stepLabel={position ? t("label", position) : ""}
      title={t("people.title")}
      lead={t("people.lead")}
      primaryLabel={t("next")}
      onPrimary={() => void submit({ people, hasPets })}
      disabledReason={total === 0 ? t("people.needOne") : undefined}
      summary={total > 0 ? t("people.total", { count: total }) : undefined}
    >
      <div className="flex flex-col gap-3">
        {PEOPLE_GROUPS.map((group) => (
          <Stepper
            key={group}
            label={t(`people.groups.${group}.label`)}
            hint={t(`people.groups.${group}.hint`)}
            decreaseLabel={t(`people.groups.${group}.decrease`)}
            increaseLabel={t(`people.groups.${group}.increase`)}
            value={people[group]}
            max={MAX_COUNT}
            onChange={(next) => setPeople((current) => ({ ...current, [group]: next }))}
          />
        ))}
      </div>
      <Panel>
        <p className="text-body-strong">{t("people.pets.question")}</p>
        <SegmentedControl<PetsAnswer>
          label={t("people.pets.question")}
          options={[
            { value: "yes", label: t("people.pets.yes") },
            { value: "no", label: t("people.pets.no") },
          ]}
          value={hasPets ? "yes" : "no"}
          onChange={(next) => setHasPets(next === "yes")}
          fullWidth
        />
        <p className="text-body-sm text-ink-muted">{t("people.pets.hint")}</p>
      </Panel>
    </StepPage>
  );
}
