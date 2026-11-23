"use client";

import { useMemo, useRef, useState } from "react";
import { Alert, BottomSheet, Button, OptionCheckbox } from "@/components/ui";
import { useHousehold } from "@/features/household/useHousehold";
import type { HouseholdSummary } from "@/lib/household";
import { addedItemCount, buildPlan, effectiveSource, EMERGENCIES, type Plan } from "@/lib/plan";
import type { EmergencyId } from "@/lib/plan";
import { itemArgs, PLAN_DAYS, type Translator } from "./format";

type EmergenciesSheetProps = {
  t: Translator;
  open: boolean;
  /** X, Escape and a tap on the scrim: the draft is discarded. */
  onClose: () => void;
  /** The save landed and the sheet was still open; `added` is how many items it brought in. */
  onSaved: (added: number) => void;
  summary: HouseholdSummary;
  /** The emergencies stored now. The draft starts as a copy each time the sheet opens. */
  saved: readonly EmergencyId[];
};

/** The item ids a plan has only because of an emergency. */
function emergencyItems(plan: Plan): string[] {
  const rows = [
    ...plan.tiers.flatMap((tier) => tier.categories.flatMap((category) => category.rows)),
    ...plan.sections.flatMap((section) => section.rows),
  ];
  return rows.filter((row) => row.emergencies).map((row) => row.itemId);
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

/**
 * "Sytuacje": the five emergencies as option cards, each with what it adds. The
 * choice is a draft that is stored on "Gotowe" only; closing any other way
 * discards it. A failed save keeps the draft and offers a retry in the footer.
 */
export function EmergenciesSheet({
  t,
  open,
  onClose,
  onSaved,
  summary,
  saved,
}: EmergenciesSheetProps) {
  const { setEmergencies } = useHousehold();
  const [draft, setDraft] = useState<readonly EmergencyId[]>(saved);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  // Each opening starts from what is stored (state adjusted while rendering, not in an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(saved);
      setSaving(false);
      setFailed(false);
    }
  }

  // A save belongs to the opening that started it: closing the sheet detaches it, so its
  // result neither closes anything nor shows a note.
  const attempt = useRef(0);
  const dismiss = () => {
    attempt.current += 1;
    onClose();
  };

  const draftPlan = useMemo(() => buildPlan(summary, PLAN_DAYS, draft), [summary, draft]);
  const args = useMemo(() => itemArgs(summary, draftPlan), [summary, draftPlan]);
  // What each emergency adds for this household (sandbags only for a house, and so on).
  const adds = useMemo(
    () =>
      new Map(
        EMERGENCIES.map(({ id }) => [id, emergencyItems(buildPlan(summary, PLAN_DAYS, [id]))]),
      ),
    [summary],
  );

  const save = () => {
    if (saving) return;
    if (sameSet(draft, saved)) {
      dismiss();
      return;
    }
    // Counted now, against the plan as it is stored now, not from the plan after the save.
    const added = addedItemCount(summary, PLAN_DAYS, saved, draft);
    const mine = ++attempt.current;
    setSaving(true);
    setFailed(false);
    setEmergencies(draft).then(
      () => {
        if (mine !== attempt.current) return;
        setSaving(false);
        onSaved(added);
      },
      () => {
        if (mine !== attempt.current) return;
        setSaving(false);
        setFailed(true);
      },
    );
  };

  const toggle = (id: EmergencyId, checked: boolean) =>
    setDraft((previous) =>
      checked
        ? [...previous.filter((other) => other !== id), id]
        : previous.filter((other) => other !== id),
    );

  const footer = (
    <div className="flex flex-col gap-3">
      {failed ? (
        <Alert title={t("plan.emergencies.ui.sheet.errorTitle")}>
          {t("plan.emergencies.ui.sheet.errorBody")}
        </Alert>
      ) : (
        <p aria-live="polite" className="text-center text-body-sm">
          {draftPlan.emergencyItemCount === 0
            ? t("plan.emergencies.ui.sheet.countNone")
            : t("plan.emergencies.ui.sheet.count", { count: draftPlan.emergencyItemCount })}
        </p>
      )}
      <Button
        onClick={save}
        disabledReason={saving ? t("plan.emergencies.ui.sheet.saving") : undefined}
      >
        {failed ? t("plan.emergencies.ui.sheet.retry") : t("plan.emergencies.ui.sheet.done")}
      </Button>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onClose={dismiss}
      title={t("plan.emergencies.ui.sheet.title")}
      closeLabel={t("plan.emergencies.ui.sheet.close")}
      footer={footer}
    >
      <p className="text-body">{t("plan.emergencies.ui.sheet.lead")}</p>
      <ul className="flex flex-col gap-3">
        {EMERGENCIES.map((scenario) => {
          const id = scenario.id as EmergencyId;
          const source = effectiveSource(scenario);
          return (
            <li key={id}>
              <OptionCheckbox
                label={t(`plan.emergencies.${id}.name`)}
                checked={draft.includes(id)}
                onChange={(checked) => toggle(id, checked)}
                details={{
                  openLabel: t("plan.emergencies.ui.sheet.openDetails"),
                  closeLabel: t("plan.emergencies.ui.sheet.closeDetails"),
                  content: (
                    <div className="flex flex-col gap-2">
                      <p>{t(`plan.emergencies.${id}.explanation`)}</p>
                      <p className="font-bold">{t("plan.emergencies.ui.sheet.adds")}</p>
                      <ul className="list-disc pl-5">
                        {(adds.get(id) ?? []).map((itemId) => (
                          <li key={itemId}>{t(`plan.items.${itemId}.name`, args)}</li>
                        ))}
                      </ul>
                      <p className="text-caption text-ink-muted">
                        {source === "official"
                          ? t("plan.emergencies.ui.sheet.sourceOfficial")
                          : t("plan.emergencies.ui.sheet.sourcePrepwise")}
                      </p>
                    </div>
                  ),
                }}
              />
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}
