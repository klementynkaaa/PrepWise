"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Stepper, StepPage } from "@/components/ui";
import type { AppLocale } from "@/i18n/routing";
import {
  MAX_COUNT,
  stepPosition,
  type Household,
  type HouseholdAnswers,
  type PetCounts,
} from "@/lib/household";
import { HeldPage } from "./HeldPage";
import { PET_KINDS } from "./groups";
import { backHref } from "./paths";
import { SaveError } from "./SaveError";
import { useStepAccess } from "./useStepAccess";
import { useStepSubmit } from "./useStepSubmit";

/** Step 2 (only with pets): how many pets of each kind and size. */
export function PetsStep({ locale }: { locale: AppLocale }) {
  const access = useStepAccess("pets", locale);
  if (access.held) return <HeldPage />;
  return <PetsForm locale={locale} household={access.household} answers={access.answers} />;
}

function PetsForm({
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
  const [pets, setPets] = useState<PetCounts>(answers.pets);
  const { failed, submit, retry, dismiss } = useStepSubmit("pets", locale, household);

  if (failed) return <SaveError onRetry={retry} onBack={dismiss} />;

  const position = stepPosition(answers, "pets");

  return (
    <StepPage
      backHref={backHref("pets", answers, household?.status, locale)}
      backLabel={tc("back")}
      stepLabel={position ? t("label", position) : ""}
      title={t("pets.title")}
      lead={t("pets.lead")}
      primaryLabel={t("next")}
      onPrimary={() => void submit({ pets })}
    >
      <div className="flex flex-col gap-3">
        {PET_KINDS.map((kind) => (
          <Stepper
            key={kind}
            label={t(`pets.kinds.${kind}.label`)}
            hint={kind === "cat" ? undefined : t(`pets.kinds.${kind}.hint`)}
            decreaseLabel={t(`pets.kinds.${kind}.decrease`)}
            increaseLabel={t(`pets.kinds.${kind}.increase`)}
            value={pets[kind]}
            max={MAX_COUNT}
            onChange={(next) => setPets((current) => ({ ...current, [kind]: next }))}
          />
        ))}
      </div>
    </StepPage>
  );
}
