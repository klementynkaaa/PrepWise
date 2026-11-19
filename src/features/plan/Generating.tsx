"use client";

import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useState } from "react";
import { EmptyState, Icon, PageShell, PanelList } from "@/components/ui";

/** The steps in order. The last one is the flag write, so it waits for storage. */
const STEPS = ["match", "count", "order", "save"] as const;
/** How long each step shows before the next one starts. */
export const STEP_MS = 400;
/** A save still pending after this long is treated as failed, so the screen never hangs. */
export const SAVE_TIMEOUT_MS = 10_000;

type GeneratingProps = {
  /** Stores that the plan exists (the last step). Rejects when storage fails. */
  save: () => Promise<void>;
  /** Called once the save resolved, e.g. to open the plan. */
  onSaved: () => void;
  /** Called when the save rejected or took longer than `SAVE_TIMEOUT_MS`. */
  onFailed: () => void;
};

/**
 * The short "Liczenie planu" screen after "Stwórz plan". The steps advance on
 * a timer; the last one awaits `save`. Unmounting clears the timers, and a
 * save that settles after unmount neither navigates nor reports an error. A
 * save that hangs (e.g. storage locked by another tab) fails after a timeout.
 * Progress is announced through one status region.
 */
export function Generating({ save, onSaved, onFailed }: GeneratingProps) {
  const t = useTranslations("generating");
  const [current, setCurrent] = useState(0);
  // The status region starts empty and gets the first step right after mount:
  // text that is already there when a live region appears is often not read.
  const [announced, setAnnounced] = useState(false);

  // Settles once: the first of the save's result and the timeout wins.
  const runSave = useEffectEvent((isActive: () => boolean): number => {
    let settled = false;
    const settle = (done: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (isActive()) done();
    };
    const timeout = window.setTimeout(() => settle(onFailed), SAVE_TIMEOUT_MS);
    save().then(
      () => settle(onSaved),
      () => settle(onFailed),
    );
    return timeout;
  });

  useEffect(() => {
    let active = true;
    let saveTimeout: number | undefined;
    const first = window.setTimeout(() => setAnnounced(true), 0);
    const timers = STEPS.slice(1).map((_, index) =>
      window.setTimeout(
        () => {
          const step = index + 1;
          setCurrent(step);
          if (step === STEPS.length - 1) saveTimeout = runSave(() => active);
        },
        (index + 1) * STEP_MS,
      ),
    );
    return () => {
      active = false;
      [first, saveTimeout, ...timers].forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <PageShell>
      <main className="flex flex-1 flex-col justify-center px-4 py-6">
        <EmptyState
          illustration="generating-plan"
          headingLevel={1}
          title={t("title")}
          action={
            <PanelList>
              <ol className="flex flex-col text-left">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex items-center gap-3 p-2.5">
                    <StepMarker
                      state={index < current ? "done" : index === current ? "now" : "next"}
                    />
                    <span
                      className={
                        index > current ? "text-body-strong text-ink-muted" : "text-body-strong"
                      }
                    >
                      {t(`steps.${step}`)}
                    </span>
                  </li>
                ))}
              </ol>
            </PanelList>
          }
        >
          {/* The one live region: each step is announced once, as it starts. */}
          <span role="status" className="sr-only">
            {announced ? t(`steps.${STEPS[current]}`) : ""}
          </span>
        </EmptyState>
      </main>
    </PageShell>
  );
}

/** Done: a check. Now: an accent dot that pulses only when motion is welcome. Next: a grey dot. */
function StepMarker({ state }: { state: "done" | "now" | "next" }) {
  if (state === "done") {
    return (
      <span className="inline-flex size-5 shrink-0 items-center justify-center text-accent">
        <Icon name="check" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="inline-flex size-5 shrink-0 items-center justify-center">
      <span
        className={
          state === "now"
            ? "size-2 rounded-full bg-accent motion-safe:animate-pulse"
            : "size-2 rounded-full bg-control-border"
        }
      />
    </span>
  );
}
