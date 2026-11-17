"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Household, HouseholdStore, LoadResult, Step, StepPatches } from "@/lib/household";

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
const UNAVAILABLE: State = { status: "unavailable", kind: null, household: null };

function stateOf(result: LoadResult): State {
  switch (result.kind) {
    case "found":
      return { status: "ready", kind: "found", household: result.household };
    case "unavailable":
      return UNAVAILABLE;
    default:
      return { status: "ready", kind: result.kind, household: null };
  }
}

/**
 * Gives screens the stored household. Storage is read in an effect, because
 * pages are prerendered and have no local database at build time, and read
 * again whenever the store reports a change (`subscribe`).
 */
export function HouseholdProvider({
  store,
  children,
}: {
  store: HouseholdStore;
  children: ReactNode;
}) {
  const [state, setState] = useState<State>(LOADING);
  // Every read and save takes a number; only the newest one may set the state,
  // so a slow read that started before a save cannot bring back older answers.
  const latest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const reload = () => {
      const ticket = ++latest.current;
      const apply = (next: State) => {
        if (!cancelled && ticket === latest.current) setState(next);
      };
      store
        .load()
        .then((result) => apply(stateOf(result)))
        // The interface does not promise that load() never rejects: treat a rejection
        // as unavailable storage rather than leaving the screen on the held page.
        .catch(() => apply(UNAVAILABLE));
    };
    reload();
    const unsubscribe = store.subscribe(reload);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [store]);

  const saveStep = useCallback(
    async <S extends Step>(step: S, patch: StepPatches[S]) => {
      const saved = await store.saveStep(step, patch);
      latest.current += 1;
      setState({ status: "ready", kind: "found", household: saved });
    },
    [store],
  );

  const value = useMemo<HouseholdContextValue>(() => ({ ...state, saveStep }), [state, saveStep]);

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}
