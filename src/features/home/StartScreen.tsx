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
  ReadinessPanel,
  ReadinessRow,
  SectionHeader,
  Skeleton,
  SkeletonGroup,
  Step,
  StepList,
  type IllustrationName,
} from "@/components/ui";
import { HeldPage } from "@/features/household/HeldPage";
import { appHref, targetHref } from "@/features/household/paths";
import { useCompleteProfile } from "@/features/household/useCompleteProfile";
import { countItems, householdMembers, PLAN_DAYS, tierItemCount } from "@/features/plan/format";
import { sectionAnchor, tierAnchor } from "@/features/plan/PlanTiers";
import { AppFrame } from "@/features/shell/AppFrame";
import { AppUnavailable } from "@/features/shell/AppUnavailable";
import type { AppLocale } from "@/i18n/routing";
import { summarise, type Household, type Tick } from "@/lib/household";
import { buildList, type ListProgress, type ShoppingList } from "@/lib/list";
import { progressPercent } from "@/lib/progress";
import {
  buildPlan,
  knownEmergencies,
  planStage,
  startSteps,
  type Plan,
  type PlanStage,
  type StartStepId,
  type StartStepState,
} from "@/lib/plan";

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
  return (
    <StartReady
      household={profile.household}
      ticks={profile.ticks}
      emergencies={profile.emergencies}
      listCreated={profile.listCreated}
      locale={locale}
    />
  );
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

function StartReady({
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
  const t = useTranslations("home");
  const summary = useMemo(() => summarise(household), [household]);
  const chosen = useMemo(() => knownEmergencies(emergencies), [emergencies]);
  const plan = useMemo(() => buildPlan(summary, PLAN_DAYS, chosen), [summary, chosen]);
  const who = useMemo(() => {
    const list = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
    return list.format(
      householdMembers(summary).map(([key, count]) => t(`household.members.${key}`, { count })),
    );
  }, [summary, locale, t]);
  // The list's own numbers, so Start, Plan and the list agree.
  const shopping = useMemo(() => buildList(plan, ticks), [plan, ticks]);
  // Complete means everything ticked: home supplies and the backpack, when there is one.
  const stage = planStage(plan, listCreated, shopping.progress.left === 0);

  return (
    <AppFrame locale={locale}>
      <PageBody>
        <h1 className="sr-only">{t("title")}</h1>
        <Banner illustration="banner-household" titleAs="h2" title={t("household.title")}>
          <span className="flex flex-col items-start gap-2">
            <span>{t("household.line", { who })}</span>
            <ButtonLink href={targetHref("overview", locale)} size="small">
              <span aria-hidden="true">{t("household.change")}</span>
              <span className="sr-only">{t("household.changeLabel")}</span>
            </ButtonLink>
          </span>
        </Banner>

        {listCreated ? <Readiness plan={plan} shopping={shopping} locale={locale} /> : null}

        <TodoSteps shopping={shopping} stage={stage} locale={locale} />

        {listCreated ? null : <PlanTiles plan={plan} locale={locale} />}
      </PageBody>
    </AppFrame>
  );
}

/** Before the list exists: the plan as tiles, one per tier and member section. */
function PlanTiles({ plan, locale }: { plan: Plan; locale: AppLocale }) {
  const t = useTranslations("home");
  const tPlan = useTranslations("plan");
  const planHref = appHref("plan", locale);
  return (
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
  );
}

/**
 * Once the list exists, right under the banner: a ring with the overall percentage and, with
 * an evacuation backpack in the plan, a row per part (home supplies, backpack) leading to the
 * list. The numbers come from the list itself, so Start, Plan and the list show the same count.
 */
function Readiness({
  plan,
  shopping,
  locale,
}: {
  plan: Plan;
  shopping: ShoppingList;
  locale: AppLocale;
}) {
  const t = useTranslations();
  const { progress, home, backpack } = shopping;
  const listHref = appHref("list", locale);
  const note =
    progress.left === 0
      ? t("home.readiness.note.complete")
      : progress.done === 0
        ? t("home.readiness.note.empty", { backpack: backpack ? "yes" : "no" })
        : t("home.readiness.note.progress", { count: progress.left });
  const row = (part: ListProgress, illustration: IllustrationName, name: string) => (
    <ReadinessRow
      href={listHref}
      illustration={illustration}
      name={name}
      count={t("progress.count", { done: part.done, total: part.total })}
      done={part.done}
      total={part.total}
    />
  );
  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title={t("home.readiness.title", { hours: plan.days * 24 })}
        action={{ href: appHref("plan", locale), label: t("home.readiness.plan") }}
      />
      <ReadinessPanel
        done={progress.done}
        total={progress.total}
        percent={t("progress.percent", { percent: progressPercent(progress.done, progress.total) })}
        count={t("progress.done", { done: progress.done, total: progress.total })}
        note={note}
      >
        {backpack ? (
          <>
            {row(home, "item-food", t("home.readiness.rows.supplies"))}
            {row(backpack, "item-backpack", t("home.readiness.rows.backpack"))}
          </>
        ) : null}
      </ReadinessPanel>
    </div>
  );
}

/**
 * "Do zrobienia": the steps from the plan to a packed backpack, one of them current. The
 * current step leads to where the work is: the plan before the list exists, then the list.
 */
function TodoSteps({
  shopping,
  stage,
  locale,
}: {
  shopping: ShoppingList;
  stage: PlanStage;
  locale: AppLocale;
}) {
  const t = useTranslations("home.todo");
  const { backpack, home } = shopping;
  const { steps, current } = startSteps({
    stage,
    homeLeft: home.left,
    hasBackpack: backpack !== null,
  });
  const listHref = appHref("list", locale);
  const status = (state: StartStepState) => t(`status.${state}`);

  const caption = (id: StartStepId, state: StartStepState): string => {
    if (id === "plan") return t("plan.caption");
    if (id === "supplies") {
      if (state === "done") return t("supplies.done");
      return stage === "ready" ? t("supplies.ready") : t("supplies.left", { count: home.left });
    }
    const total = backpack?.total ?? 0;
    if (state === "done") return t("backpack.done");
    if (state === "current") return t("backpack.left", { count: backpack?.left ?? 0 });
    return t("backpack.later", { count: total });
  };
  const action = (id: StartStepId) => {
    if (id === "supplies") {
      return stage === "ready" ? (
        <ButtonLink href={appHref("plan", locale)} size="small">
          {t("supplies.openPlan")}
        </ButtonLink>
      ) : (
        <ButtonLink href={listHref} size="small">
          {t("supplies.openList")}
        </ButtonLink>
      );
    }
    return id === "backpack" ? (
      <ButtonLink href={listHref} size="small">
        {t("backpack.open")}
      </ButtonLink>
    ) : null;
  };

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title={t("title")}
        meta={current ? t("progress", { current, total: steps.length }) : undefined}
      />
      <StepList>
        {steps.map((step) => (
          <Step
            key={step.id}
            state={step.state}
            statusLabel={status(step.state)}
            name={t(`${step.id}.name`)}
            caption={caption(step.id, step.state)}
            action={step.state === "current" ? action(step.id) : undefined}
          />
        ))}
      </StepList>
      {stage === "complete" ? (
        <Notice icon="check">
          <span className="flex flex-col gap-1">
            <span className="text-body-strong">{t("complete.title")}</span>
            <span>{t("complete.body")}</span>
          </span>
        </Notice>
      ) : null}
    </div>
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
