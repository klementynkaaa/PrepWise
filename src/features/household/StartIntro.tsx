"use client";

import { useTranslations } from "next-intl";
import {
  ButtonLink,
  Illustration,
  PageBody,
  PageFooter,
  PageHeader,
  PageShell,
  Panel,
  TopBar,
} from "@/components/ui";
import { localePath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/routing";
import { emptyAnswers, firstUnfinishedStep } from "@/lib/household";
import { targetHref } from "./paths";
import { useHousehold } from "./useHousehold";

const STEP_KEYS = ["people", "needs", "plan"] as const;

/**
 * The intro before the questions. Its button opens the first unfinished step,
 * so a new and a resumed profile see the same screen.
 */
export function StartIntro({ locale }: { locale: AppLocale }) {
  const t = useTranslations("start");
  const tc = useTranslations("common");
  const { household } = useHousehold();
  const target = firstUnfinishedStep(household ?? emptyAnswers());

  return (
    <PageShell>
      <TopBar back={{ href: localePath("/", locale), label: tc("back") }} />
      <PageHeader title={t("title")} lead={t("lead")} />
      <PageBody>
        <div className="flex justify-center gap-2 py-2" aria-hidden="true">
          <Illustration name="item-water" />
          <Illustration name="item-food" />
          <Illustration name="item-first-aid" />
          <Illustration name="item-flashlight" />
        </div>
        <Panel as="section">
          <h2 className="sr-only">{t("stepsLabel")}</h2>
          <ol className="flex flex-col gap-3">
            {STEP_KEYS.map((key, index) => (
              <li key={key} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-control font-bold text-on-accent"
                >
                  {index + 1}
                </span>
                <span className="text-body-strong">{t(`steps.${key}`)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </PageBody>
      <PageFooter>
        <ButtonLink href={targetHref(target, locale)}>{t("action")}</ButtonLink>
        <p className="text-center text-body-sm text-ink-muted">{t("duration")}</p>
      </PageFooter>
    </PageShell>
  );
}
