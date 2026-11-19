"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";
import {
  Banner,
  ButtonLink,
  LinkPanel,
  Notice,
  PageBody,
  PriorityBadge,
  SectionHeader,
  Skeleton,
  SkeletonGroup,
  TextLink,
} from "@/components/ui";
import { HeldPage } from "@/features/household/HeldPage";
import { appHref, targetHref } from "@/features/household/paths";
import { useCompleteProfile } from "@/features/household/useCompleteProfile";
import { countItems, householdMembers, PLAN_DAYS, tierItemCount } from "@/features/plan/format";
import { sectionAnchor, tierAnchor } from "@/features/plan/PlanTiers";
import { AppFrame } from "@/features/shell/AppFrame";
import { AppUnavailable } from "@/features/shell/AppUnavailable";
import type { AppLocale } from "@/i18n/routing";
import { summarise, type Household } from "@/lib/household";
import { buildPlan, planStage } from "@/lib/plan";

/**
 * Start: where a returning household lands. The household banner, one thing
 * to do (derived from the plan's stage) and the plan as tiles leading into it.
 * It needs a finished profile and a plan created on this device; without the
 * plan it opens the overview, where the plan is made.
 */
export function StartScreen({ locale }: { locale: AppLocale }) {
  const profile = useCompleteProfile(locale);

  if (profile.status === "unavailable") return <StartUnavailable locale={locale} />;
  if (profile.status === "held") return <StartLoading locale={locale} />;
  if (!profile.planCreated) return <ToOverview locale={locale} />;
  return <StartReady household={profile.household} locale={locale} />;
}

/** No plan on this device yet: the overview is where it is made. */
function ToOverview({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const overview = targetHref("overview", locale);
  useEffect(() => {
    router.replace(overview);
  }, [overview, router]);
  return <HeldPage />;
}

function StartLoading({ locale }: { locale: AppLocale }) {
  const t = useTranslations();
  return (
    <AppFrame locale={locale}>
      {/* Busy until Start shows, like the held page, so nothing reads the placeholders. */}
      <main aria-busy="true" className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
        <h1 className="sr-only">{t("home.title")}</h1>
        <SkeletonGroup label={t("common.loading")} busy={false}>
          <Skeleton shape="banner" />
          <Skeleton className="w-1/2" />
          <Skeleton shape="block" />
          <Skeleton className="w-1/2" />
          <Skeleton shape="block" />
        </SkeletonGroup>
      </main>
    </AppFrame>
  );
}

function StartUnavailable({ locale }: { locale: AppLocale }) {
  const t = useTranslations("home.unavailable");
  return <AppUnavailable locale={locale} title={t("title")} body={t("body")} retry={t("retry")} />;
}

function StartReady({ household, locale }: { household: Household; locale: AppLocale }) {
  const t = useTranslations("home");
  const tPlan = useTranslations("plan");
  const summary = useMemo(() => summarise(household), [household]);
  const plan = useMemo(() => buildPlan(summary, PLAN_DAYS), [summary]);
  const who = useMemo(() => {
    const list = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
    return list.format(
      householdMembers(summary).map(([key, count]) => t(`household.members.${key}`, { count })),
    );
  }, [summary, locale, t]);
  const stage = planStage(plan);
  const planHref = appHref("plan", locale);

  return (
    <AppFrame locale={locale}>
      <PageBody>
        <h1 className="sr-only">{t("title")}</h1>
        <Banner illustration="banner-household" titleAs="h2" title={t("household.title")}>
          <span className="flex flex-col items-start gap-2">
            <span>{t("household.line", { who })}</span>
            <ButtonLink href={targetHref("overview", locale)} variant="secondary" size="small">
              <span aria-hidden="true">{t("household.change")}</span>
              <span className="sr-only">{t("household.changeLabel")}</span>
            </ButtonLink>
          </span>
        </Banner>

        <div className="flex flex-col gap-2">
          <SectionHeader title={t("todo.title")} />
          <Notice>
            <span className="flex flex-col gap-1">
              <span className="text-body-strong">{t(`todo.${stage}.title`)}</span>
              <span>{t(`todo.${stage}.body`)}</span>
              <TextLink href={planHref}>{t(`todo.${stage}.action`)}</TextLink>
            </span>
          </Notice>
        </div>

        <div className="flex flex-col gap-2">
          <SectionHeader
            title={t("plan.title", { hours: plan.days * 24 })}
            action={{ href: planHref, label: t("plan.all") }}
          />
          {/* Tiles sit side by side while they fit; at large text they stack. */}
          <div className="@container flex flex-col gap-2">
            <ul className="grid gap-2 @min-row-stack:grid-cols-3">
              {plan.tiers.map((tier) => (
                <li key={tier.tier}>
                  <PlanTile
                    href={`${planHref}#${tierAnchor(tier.tier)}`}
                    badge={<PriorityBadge tier={tier.tier} />}
                    name={
                      <>
                        <span className="sr-only">{tPlan("tierLabel", { tier: tier.tier })}: </span>
                        {t(`plan.tiers.${tier.tier}`)}
                      </>
                    }
                    count={tPlan("itemCount", { count: tierItemCount(tier) })}
                  />
                </li>
              ))}
            </ul>
            {plan.sections.length > 0 ? (
              <ul className="grid gap-2 @min-row-stack:grid-cols-2">
                {plan.sections.map((section) => (
                  <li key={section.id}>
                    <PlanTile
                      href={`${planHref}#${sectionAnchor(section.id)}`}
                      name={t(`plan.sections.${section.id}`, {
                        kind: section.id === "pets" ? section.petKind : "dog",
                      })}
                      count={tPlan("itemCount", { count: countItems(section.rows) })}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </PageBody>
    </AppFrame>
  );
}

/**
 * One tile of the plan block: a panel that leads to its part of the plan.
 * The whole tile is the link, so its words are the link's name.
 */
function PlanTile({
  href,
  badge,
  name,
  count,
}: {
  href: string;
  badge?: ReactNode;
  name: ReactNode;
  count: string;
}) {
  return (
    <LinkPanel href={href}>
      {badge}
      <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className="min-w-0 text-body-sm font-bold wrap-break-word hyphens-auto">{name}</span>
        <span className="text-caption text-ink-muted">{count}</span>
      </span>
    </LinkPanel>
  );
}
