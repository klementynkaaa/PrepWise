"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, ButtonLink, LiveStatus, Notice, Panel, ProgressBar } from "@/components/ui";
import { appHref } from "@/features/household/paths";
import { useHousehold } from "@/features/household/useHousehold";
import type { AppLocale } from "@/i18n/routing";
import type { ListProgress } from "@/lib/list";
import type { Translator } from "./format";

type ListPanelProps = { t: Translator; locale: AppLocale };

/**
 * The "Lista zakupów" panel at the end of Plan, once the list exists: the
 * list's progress (the same numbers as the list and Start) and a way into it.
 */
export function ListProgressPanel({
  t,
  locale,
  progress,
}: ListPanelProps & { progress: ListProgress }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-heading-sm">{t("plan.list.title")}</h2>
        <p className="text-body-strong">
          {t("progress.done", { done: progress.done, total: progress.total })}
        </p>
      </div>
      <ProgressBar done={progress.done} total={progress.total} label={t("list.progress.bar")} />
      <ButtonLink href={appHref("list", locale)} variant="secondary">
        {t("plan.list.open")}
      </ButtonLink>
    </Panel>
  );
}

/**
 * The "Lista zakupów" panel at the end of Plan, before the list exists: it
 * stores the device's list flag, then opens the list. A failed write stays
 * on Plan with a notice, as on the list's own empty state.
 */
export function CreateListPanel({ t, locale, itemCount }: ListPanelProps & { itemCount: number }) {
  const { markListCreated } = useHousehold();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  // One write at a time: a second tap while it runs does nothing.
  const running = useRef(false);

  const create = () => {
    if (running.current) return;
    running.current = true;
    setFailed(false);
    markListCreated().then(
      () => router.push(appHref("list", locale)),
      () => {
        running.current = false;
        setFailed(true);
      },
    );
  };

  return (
    <>
      <Panel>
        <div className="flex flex-col gap-1">
          <h2 className="text-heading-sm">{t("plan.list.title")}</h2>
          <p className="text-body-sm text-ink-muted">{t("plan.list.line", { count: itemCount })}</p>
        </div>
        <Button onClick={create}>{t("plan.list.create")}</Button>
      </Panel>
      {failed ? <Notice live={false}>{t("list.empty.failed")}</Notice> : null}
      <LiveStatus>{failed ? t("list.empty.failed") : null}</LiveStatus>
    </>
  );
}
