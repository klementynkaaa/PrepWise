"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { OptionGroup, OptionRadio, StepPage } from "@/components/ui";
import type { AppLocale } from "@/i18n/routing";
import {
  HOUSING_TYPES,
  stepPosition,
  type Household,
  type HouseholdAnswers,
  type HousingType,
} from "@/lib/household";
import { HeldPage } from "./HeldPage";
import { backHref } from "./paths";
import { SaveError } from "./SaveError";
import { useStepAccess } from "./useStepAccess";
import { useStepSubmit } from "./useStepSubmit";

/** Step 3: flat or house. One answer, required. */
export function HousingStep({ locale }: { locale: AppLocale }) {
  const access = useStepAccess("housing", locale);
  if (access.held) return <HeldPage />;
  return <HousingForm locale={locale} household={access.household} answers={access.answers} />;
}

function HousingForm({
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
  const [housing, setHousing] = useState<HousingType | null>(answers.housingType);
  const { failed, submit, retry, dismiss } = useStepSubmit("housing", locale, household);

  if (failed) return <SaveError onRetry={retry} onBack={dismiss} />;

  const position = stepPosition(answers, "housing");

  return (
    <StepPage
      backHref={backHref("housing", answers, household?.status, locale)}
      backLabel={tc("back")}
      stepLabel={position ? t("label", position) : ""}
      title={t("housing.title")}
      lead={t("housing.lead")}
      primaryLabel={t("next")}
      onPrimary={() => {
        if (housing) void submit({ housingType: housing });
      }}
      disabledReason={housing ? undefined : t("housing.required")}
    >
      <OptionGroup legend={t("housing.legend")} hideLegend>
        {HOUSING_TYPES.map((type) => (
          <OptionRadio
            key={type}
            name="housing"
            value={type}
            label={t(`housing.options.${type}.label`)}
            description={t(`housing.options.${type}.description`)}
            checked={housing === type}
            onChange={() => setHousing(type)}
          />
        ))}
      </OptionGroup>
    </StepPage>
  );
}
