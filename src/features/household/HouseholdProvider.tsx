"use client";

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Household, HouseholdStore, Step, StepPatches } from "@/lib/household";

/** What the stored profile looked like when the page opened. */
export type HouseholdKind = "none" | "found" | "invalid";

type State =
  | { status: "loading"; kind: null; household: null }
  | { status: "ready"; kind: HouseholdKind; household: Household | null }
  | { status: "unavailable"; kind: null; household: null };

export type HouseholdContextValue = State & {
  /** Saves one step. Rejects when storage fails; callers then stay on the step. */
  saveStep: <S extends Step>(step: S, patch: StepPatches[S]) => Promise<void>;
};

export const HouseholdContext = createContext<HouseholdContextValue | null>(null);

const LOADING: State = { status: "loading", kind: null, household: null };

/**
 * Gives screens the stored household. Storage is read once, in an effect,
 * because pages are prerendered and have no IndexedDB at build time.
 */
export function HouseholdProvider({
  store,
  children,
}: {
  store: HouseholdStore;
  children: ReactNode;
}) {
  const [state, setState] = useState<State>(LOADING);

  useEffect(() => {
    let cancelled = false;
    store.load().then((result) => {
      if (cancelled) return;
      switch (result.kind) {
        case "found":
          setState({ status: "ready", kind: "found", household: result.household });
          break;
        case "unavailable":
          setState({ status: "unavailable", kind: null, household: null });
          break;
        default:
          setState({ status: "ready", kind: result.kind, household: null });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const saveStep = useCallback(
    async <S extends Step>(step: S, patch: StepPatches[S]) => {
      const saved = await store.saveStep(step, patch);
      setState({ status: "ready", kind: "found", household: saved });
    },
    [store],
  );

  const value = useMemo<HouseholdContextValue>(() => ({ ...state, saveStep }), [state, saveStep]);

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}
