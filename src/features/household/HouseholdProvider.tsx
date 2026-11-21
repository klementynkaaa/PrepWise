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
import type {
  Household,
  HouseholdStore,
  LoadResult,
  Step,
  StepPatches,
  Tick,
} from "@/lib/household";

/** What the stored profile looked like when the page opened. */
export type HouseholdKind = "none" | "found" | "invalid";

/**
 * - `ticks`: the household's stored shopping-list ticks.
 * - `emergencies`: ids of the emergencies the household added to its plan.
 * - `listCreated`: the shopping list exists, created on this device or ticked
 *   on any device (a member or a reinstalled device receives the ticks).
 * - `planCreated`: this device has created a plan for the stored household, or
 *   the list exists (a list implies a plan).
 */
type Empty = {
  kind: null;
  household: null;
  ticks: Tick[];
  emergencies: string[];
  planCreated: false;
  listCreated: false;
};
type State =
  | ({ status: "loading" } & Empty)
  | {
      status: "ready";
      kind: HouseholdKind;
      household: Household | null;
      ticks: Tick[];
      emergencies: string[];
      planCreated: boolean;
      listCreated: boolean;
    }
  | ({ status: "unavailable" } & Empty);

export type HouseholdContextValue = State & {
  /** Saves one step. Rejects when storage fails; callers then stay on the step. */
  saveStep: <S extends Step>(step: S, patch: StepPatches[S]) => Promise<void>;
  /** Records that this device created a plan. Rejects when storage fails. */
  markPlanCreated: () => Promise<void>;
  /** Records that this device created the shopping list. Rejects when storage fails. */
  markListCreated: () => Promise<void>;
  /**
   * Ticks or unticks one item, then shows the stored ticks. Rejects when
   * storage fails; nothing on screen changes then.
   */
  setTick: (itemId: string, ticked: boolean, quantity: number) => Promise<void>;
  /**
   * Makes the household's chosen emergencies exactly `ids`, then shows the
   * stored selection. Rejects when storage fails; nothing on screen changes then.
   */
  setEmergencies: (ids: readonly string[]) => Promise<void>;
};

export const HouseholdContext = createContext<HouseholdContextValue | null>(null);

const EMPTY: Empty = {
  kind: null,
  household: null,
  ticks: [],
  emergencies: [],
  planCreated: false,
  listCreated: false,
};
const LOADING: State = { status: "loading", ...EMPTY };
const UNAVAILABLE: State = { status: "unavailable", ...EMPTY };

function stateOf(result: LoadResult): State {
  switch (result.kind) {
    case "found": {
      const listCreated = result.listCreatedAt !== null || result.ticks.some((t) => t.selected);
      return {
        status: "ready",
        kind: "found",
        household: result.household,
        ticks: result.ticks,
        emergencies: result.emergencies,
        planCreated: result.planCreatedAt !== null || listCreated,
        listCreated,
      };
    }
    case "unavailable":
      return UNAVAILABLE;
    default:
      return {
        status: "ready",
        kind: result.kind,
        household: null,
        ticks: [],
        emergencies: [],
        planCreated: false,
        listCreated: false,
      };
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
      // A step save never changes the ticks, the emergencies or the plan and list flags; keep
      // them, as this cancels the reload that would have read them.
      setState((previous) => {
        const ready = previous.status === "ready";
        return {
          status: "ready",
          kind: "found",
          household: saved,
          ticks: ready ? previous.ticks : [],
          emergencies: ready ? previous.emergencies : [],
          planCreated: ready && previous.planCreated,
          listCreated: ready && previous.listCreated,
        };
      });
    },
    [store],
  );

  const markPlanCreated = useCallback(async () => {
    await store.markPlanCreated();
    latest.current += 1;
    setState((previous) =>
      previous.status === "ready" ? { ...previous, planCreated: true } : previous,
    );
  }, [store]);

  const markListCreated = useCallback(async () => {
    await store.markListCreated();
    latest.current += 1;
    setState((previous) =>
      previous.status === "ready"
        ? { ...previous, listCreated: true, planCreated: true }
        : previous,
    );
  }, [store]);

  const setTick = useCallback(
    async (itemId: string, ticked: boolean, quantity: number) => {
      await store.setTick(itemId, ticked, quantity);
      // No optimistic layer: show what the store now holds. A newer read or
      // save started meanwhile wins, as for the subscribe reload. The write is
      // saved, so a failed read keeps the screen as it is (not the storage
      // error); the next store event reloads it.
      const ticket = ++latest.current;
      const next = await store.load().then(stateOf, () => null);
      if (next && ticket === latest.current) setState(next);
    },
    [store],
  );

  const setEmergencies = useCallback(
    async (ids: readonly string[]) => {
      await store.setEmergencies(ids);
      // Same as setTick: show what the store now holds, and let a newer read win.
      const ticket = ++latest.current;
      const next = await store.load().then(stateOf, () => null);
      if (next && ticket === latest.current) setState(next);
    },
    [store],
  );

  const value = useMemo<HouseholdContextValue>(
    () => ({
      ...state,
      saveStep,
      markPlanCreated,
      markListCreated,
      setTick,
      setEmergencies,
    }),
    [state, saveStep, markPlanCreated, markListCreated, setTick, setEmergencies],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}
