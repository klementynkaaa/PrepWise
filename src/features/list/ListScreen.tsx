"use client";

import { useTranslations } from "next-intl";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  EmptyState,
  Notice,
  LiveStatus,
  PageHeader,
  Panel,
  ProgressPanel,
  Skeleton,
  SkeletonGroup,
  TextButton,
} from "@/components/ui";
import { useCompleteProfile } from "@/features/household/useCompleteProfile";
import { useHousehold } from "@/features/household/useHousehold";
import { householdWho, itemArgs, PLAN_DAYS, usePlanTranslator } from "@/features/plan/format";
import type { RowContext } from "@/features/plan/PlanTiers";
import { SourcesSheet } from "@/features/plan/SourcesSheet";
import { AppFrame } from "@/features/shell/AppFrame";
import { AppUnavailable } from "@/features/shell/AppUnavailable";
import type { AppLocale } from "@/i18n/routing";
import { summarise, type Household, type Tick } from "@/lib/household";
import { buildList, type ListRow } from "@/lib/list";
import { buildPlan } from "@/lib/plan";
import { groupKey, ListGroupPanel, rowCheckbox } from "./ListGroups";

/**
 * The shopping list: the plan's items as a checklist, derived from the stored
 * profile and ticks every time it opens. Before the list exists it offers to
 * create it.
 */
export function ListScreen({ locale }: { locale: AppLocale }) {
  const profile = useCompleteProfile(locale);
  // Created on this screen: the button is gone, so focus moves to the first thing to do.
  const [created, setCreated] = useState(false);

  if (profile.status === "unavailable") return <ListUnavailable locale={locale} />;
  if (profile.status === "held") return <ListLoading locale={locale} />;
  if (!profile.listCreated) {
    return <ListNotCreated locale={locale} onCreated={() => setCreated(true)} />;
  }
  return (
    <ListReady
      household={profile.household}
      ticks={profile.ticks}
      locale={locale}
      focusFirst={created}
    />
  );
}

function ListLoading({ locale }: { locale: AppLocale }) {
  const t = useTranslations("list");
  return (
    <AppFrame locale={locale}>
      {/* Busy until the list shows, so nothing reads the placeholders. */}
      <main aria-busy="true" className="flex flex-1 flex-col">
        <PageHeader title={t("title")} />
        <SkeletonGroup label={t("loading")} busy={false} className="flex-1 px-4 pt-4 pb-6">
          <Skeleton className="w-3/4" />
          <Skeleton shape="block" />
          <Skeleton shape="block" />
          <Skeleton shape="block" />
          <Skeleton shape="block" />
        </SkeletonGroup>
      </main>
    </AppFrame>
  );
}

function ListUnavailable({ locale }: { locale: AppLocale }) {
  const t = useTranslations("list.unavailable");
  return <AppUnavailable locale={locale} title={t("title")} retry={t("retry")} />;
}

/** No list yet (reached through the tab or a link): one button creates it from the plan. */
function ListNotCreated({ locale, onCreated }: { locale: AppLocale; onCreated: () => void }) {
  const t = useTranslations("list");
  const { markListCreated } = useHousehold();
  const [failed, setFailed] = useState(false);
  const create = () => {
    setFailed(false);
    markListCreated().then(onCreated, () => setFailed(true));
  };

  return (
    <AppFrame locale={locale}>
      <main className="flex flex-1 flex-col">
        <PageHeader title={t("title")} />
        <div className="flex flex-1 flex-col justify-center gap-3 px-4 pt-4 pb-6">
          <EmptyState
            illustration="empty-shopping"
            title={t("empty.title")}
            action={<Button onClick={create}>{t("empty.create")}</Button>}
          >
            {t("empty.body")}
          </EmptyState>
          {failed ? <Notice live={false}>{t("empty.failed")}</Notice> : null}
          <LiveStatus>{failed ? t("empty.failed") : null}</LiveStatus>
        </div>
      </main>
    </AppFrame>
  );
}

/** The tick being saved, so focus can follow its row once the stored ticks show it. */
type PendingTick = { itemId: string; ticked: boolean };

function ListReady({
  household,
  ticks,
  locale,
  focusFirst,
}: {
  household: Household;
  ticks: Tick[];
  locale: AppLocale;
  focusFirst: boolean;
}) {
  const t = usePlanTranslator();
  const { setTick } = useHousehold();

  const summary = useMemo(() => summarise(household), [household]);
  const plan = useMemo(() => buildPlan(summary, PLAN_DAYS), [summary]);
  const shopping = useMemo(() => buildList(plan, ticks), [plan, ticks]);
  const listFormat = useMemo(
    () => new Intl.ListFormat(locale, { style: "long", type: "conjunction" }),
    [locale],
  );
  const ctx: RowContext = { t, args: itemArgs(summary, plan), list: listFormat };
  const { progress } = shopping;
  const hours = plan.days * 24;

  const [sourcesOpen, setSourcesOpen] = useState(false);
  const sourcesOpener = useRef<HTMLButtonElement>(null);
  const closeSources = () => {
    setSourcesOpen(false);
    sourcesOpener.current?.focus();
  };

  // Finished groups fold; one opened by hand stays open for the rest of the visit.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (key: string) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const [saveFailed, setSaveFailed] = useState(false);
  // The live region stays empty until the first saved tick, then follows the count.
  const [announce, setAnnounce] = useState(false);

  const groupsRoot = useRef<HTMLDivElement>(null);
  const headers = useRef(new Map<string, HTMLButtonElement>());
  const pending = useRef<PendingTick | null>(null);

  // Once the stored ticks show the pending tick: keep focus on its checkbox
  // (a re-sort can take it away), or, when the tick folded its group, move
  // it to the group's header, as the checkbox is hidden now.
  useLayoutEffect(() => {
    const target = pending.current;
    const root = groupsRoot.current;
    if (!target || !root) return;
    const group = shopping.groups.find((g) => g.rows.some((r) => r.itemId === target.itemId));
    const row = group?.rows.find((r) => r.itemId === target.itemId);
    if (!group || !row || row.done !== target.ticked) return;
    pending.current = null;

    const box = rowCheckbox(root, target.itemId);
    const active = document.activeElement;
    // Only take focus back when it was lost with the row, never from elsewhere.
    if (active !== null && active !== document.body && active !== box) return;
    const key = groupKey(group);
    if (group.done === group.total && !expanded.has(key)) {
      headers.current.get(key)?.focus();
    } else if (box && active !== box) {
      box.focus();
    }
  }, [shopping, expanded]);

  // Right after "Stwórz listę zakupów" the pressed button no longer exists:
  // focus the "Najpierw" checkbox, once.
  const focusedFirst = useRef(false);
  useLayoutEffect(() => {
    const root = groupsRoot.current;
    if (!focusFirst || focusedFirst.current || !root) return;
    focusedFirst.current = true;
    const first = shopping.groups.flatMap((g) => g.rows).find((r) => r.first);
    if (first) rowCheckbox(root, first.itemId)?.focus();
  }, [focusFirst, shopping]);

  const onTick = (row: ListRow, checked: boolean) => {
    pending.current = { itemId: row.itemId, ticked: checked };
    setTick(row.itemId, checked, row.quantity).then(
      () => {
        setSaveFailed(false);
        setAnnounce(true);
      },
      () => {
        // Nothing changed: the row stays as stored and the notice explains.
        if (pending.current?.itemId === row.itemId) pending.current = null;
        setSaveFailed(true);
      },
    );
  };

  return (
    <AppFrame locale={locale}>
      <main className="flex flex-1 flex-col">
        <PageHeader title={t("list.title")} />
        <div className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
          <div className="flex flex-col items-start gap-1 px-1">
            <p className="text-body-sm text-ink-muted">
              {t("list.line", { hours, who: householdWho(t, summary, listFormat) })}
            </p>
            <TextButton
              ref={sourcesOpener}
              aria-haspopup="dialog"
              onClick={() => setSourcesOpen(true)}
            >
              {t("plan.sources.open")}
            </TextButton>
          </div>
          {/* All ticked: the success panel takes the progress panel's place. */}
          {progress.left === 0 ? (
            <Panel>
              <EmptyState illustration="kit-complete" title={t("list.done.title", { hours })}>
                {t("list.done.body", { done: progress.done, total: progress.total })}
              </EmptyState>
            </Panel>
          ) : (
            <ProgressPanel
              count={t("progress.done", { done: progress.done, total: progress.total })}
              left={t("list.progress.left", { count: progress.left })}
              done={progress.done}
              total={progress.total}
              barLabel={t("list.progress.bar")}
            />
          )}
          {saveFailed ? <Notice live={false}>{t("list.saveFailed")}</Notice> : null}
          <div ref={groupsRoot} className="flex flex-col gap-3">
            {shopping.groups.map((group) => {
              const key = groupKey(group);
              const finished = group.done === group.total;
              return (
                <ListGroupPanel
                  key={key}
                  group={group}
                  ctx={ctx}
                  collapse={
                    finished
                      ? { expanded: expanded.has(key), onToggle: () => toggle(key) }
                      : undefined
                  }
                  headerRef={(element) => {
                    if (element) headers.current.set(key, element);
                    else headers.current.delete(key);
                  }}
                  onTick={onTick}
                />
              );
            })}
          </div>
          {/* Present from the start so it is read: the new count after a saved
              tick, or why a tick could not be saved. */}
          <LiveStatus>
            {saveFailed
              ? t("list.saveFailed")
              : announce
                ? t("progress.done", { done: progress.done, total: progress.total })
                : null}
          </LiveStatus>
        </div>
      </main>
      <SourcesSheet open={sourcesOpen} onClose={closeSources} />
    </AppFrame>
  );
}
