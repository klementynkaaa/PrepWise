"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { OptionCheckbox, OptionGroup, StepPage } from "@/components/ui";
import type { AppLocale } from "@/i18n/routing";
import {
  NEEDS,
  stepPosition,
  type Household,
  type HouseholdAnswers,
  type Need,
} from "@/lib/household";
import { HeldPage } from "./HeldPage";
import { backHref } from "./paths";
import { SaveError } from "./SaveError";
import { useStepAccess } from "./useStepAccess";
import { useStepSubmit } from "./useStepSubmit";

/** Step 4: special needs. Every box is optional; "Dalej" saves the step. */
export function NeedsStep({ locale }: { locale: AppLocale }) {
  const access = useStepAccess("needs", locale);
  if (access.held) return <HeldPage />;
  return <NeedsForm locale={locale} household={access.household} answers={access.answers} />;
}

function NeedsForm({
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
  const [needs, setNeeds] = useState<Need[]>(answers.needs);
  const { failed, submit, retry, dismiss } = useStepSubmit("needs", locale, household);

  if (failed) return <SaveError onRetry={retry} onBack={dismiss} />;

  const position = stepPosition(answers, "needs");
  const toggle = (need: Need, checked: boolean) =>
    setNeeds((current) => (checked ? [...current, need] : current.filter((n) => n !== need)));

  return (
    <StepPage
      backHref={backHref("needs", answers, household?.status, locale)}
      backLabel={tc("back")}
      stepLabel={position ? t("label", position) : ""}
      title={t("needs.title")}
      lead={t("needs.lead")}
      primaryLabel={t("next")}
      onPrimary={() => void submit({ needs: NEEDS.filter((need) => needs.includes(need)) })}
    >
      <OptionGroup legend={t("needs.legend")} hideLegend>
        {NEEDS.map((need) => (
          <OptionCheckbox
            key={need}
            label={t(`needs.options.${need}.label`)}
            description={t(`needs.options.${need}.description`)}
            checkedNote={
              need === "regularMedicines" || need === "specialDiet"
                ? t(`needs.options.${need}.note`)
                : undefined
            }
            checked={needs.includes(need)}
            onChange={(checked) => toggle(need, checked)}
          />
        ))}
      </OptionGroup>
      <p className="text-body-sm text-ink-muted">{t("needs.privacy")}</p>
    </StepPage>
  );
}
