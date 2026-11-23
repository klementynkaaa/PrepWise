"use client";

import type { Ref } from "react";
import { Button, EmergencyTags, LiveStatus, Notice, Panel, TextButton } from "@/components/ui";
import type { EmergencyId } from "@/lib/plan";
import { emergencyNames, type Translator } from "./format";

type EmergenciesPanelProps = {
  t: Translator;
  /** The emergencies in the plan, in content order. */
  chosen: readonly EmergencyId[];
  /** How many items the last save added; shown once, only when above zero. */
  added: number | null;
  onOpen: () => void;
  /** The element that holds the panel's one button, so focus can return to it. */
  ref?: Ref<HTMLDivElement>;
};

/**
 * "Sytuacje" on Plan, between the banner and priority 1. With nothing chosen
 * it says the plan covers 72 hours for any situation and offers to add one;
 * with some chosen it names them as tags and offers "Zmień".
 */
export function EmergenciesPanel({ t, chosen, added, onOpen, ref }: EmergenciesPanelProps) {
  const note = added && added > 0 ? t("plan.emergencies.ui.panel.added", { count: added }) : null;
  return (
    <div ref={ref} className="flex flex-col gap-3">
      <Panel as="section">
        {chosen.length === 0 ? (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-heading-sm">{t("plan.emergencies.ui.panel.emptyTitle")}</h2>
              <p className="text-body-sm text-ink-muted">
                {t("plan.emergencies.ui.panel.emptyBody")}
              </p>
            </div>
            <Button variant="secondary" onClick={onOpen}>
              {t("plan.emergencies.ui.panel.add")}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="min-w-0 text-heading-sm">
                {t("plan.emergencies.ui.panel.chosenTitle")}
              </h2>
              <TextButton aria-haspopup="dialog" onClick={onOpen}>
                <span aria-hidden="true">{t("plan.emergencies.ui.panel.change")}</span>
                <span className="sr-only">{t("plan.emergencies.ui.panel.changeLabel")}</span>
              </TextButton>
            </div>
            <EmergencyTags lead={t("plan.emergencies.ui.lead")} names={emergencyNames(t, chosen)} />
          </>
        )}
      </Panel>
      {note ? <Notice live={false}>{note}</Notice> : null}
      {/* Present from the first paint, so the note is read when it shows up. */}
      <LiveStatus>{note}</LiveStatus>
    </div>
  );
}
