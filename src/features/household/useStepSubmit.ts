"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { AppLocale } from "@/i18n/routing";
import {
  applyStep,
  emptyAnswers,
  nextStepAfter,
  type Household,
  type Step,
  type StepPatches,
} from "@/lib/household";
import { targetHref } from "./paths";
import { useHousehold } from "./useHousehold";

/**
 * Saves a step and only then opens the next screen. A failed save keeps the
 * person on the step (`failed`), with the entered answers still in place.
 */
export function useStepSubmit<S extends Step>(
  step: S,
  locale: AppLocale,
  before: Household | null,
) {
  const { saveStep } = useHousehold();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const saving = useRef(false);
  const lastPatch = useRef<StepPatches[S] | null>(null);

  async function submit(patch: StepPatches[S]) {
    if (saving.current) return;
    saving.current = true;
    lastPatch.current = patch;
    setFailed(false);
    try {
      try {
        await saveStep(step, patch);
      } catch {
        setFailed(true);
        return;
      }
      const draft = applyStep(before ?? emptyAnswers(), step, patch);
      const next = nextStepAfter(draft, step, {
        previousHasPets: before?.hasPets,
        previousStatus: before?.status,
      });
      router.push(targetHref(next, locale));
    } finally {
      // Always release the guard, so a throw after the save cannot leave the button dead.
      saving.current = false;
    }
  }

  return {
    failed,
    submit,
    retry: () => {
      if (lastPatch.current) void submit(lastPatch.current);
    },
    dismiss: () => setFailed(false),
  };
}
