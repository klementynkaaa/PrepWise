import { act, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  createMemoryStore,
  HouseholdStoreError,
  type HouseholdStore,
  type LoadResult,
} from "@/lib/household";
import { completeHousehold } from "@/lib/household/fixtures";
import { HouseholdProvider } from "./HouseholdProvider";
import { storeWithPlan } from "./test-utils";
import { useHousehold } from "./useHousehold";

function Status() {
  return <p>{useHousehold().status}</p>;
}

function Housing() {
  const { status, household } = useHousehold();
  return <p>{status === "ready" ? (household?.housingType ?? "none") : status}</p>;
}

function PlanFlag() {
  const { status, planCreated, markPlanCreated, saveStep } = useHousehold();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <p>{status === "ready" ? `plan: ${planCreated ? "yes" : "no"}` : status}</p>
      <button
        type="button"
        onClick={() =>
          void markPlanCreated().catch((e: unknown) =>
            setError(e instanceof HouseholdStoreError ? e.code : "other"),
          )
        }
      >
        mark
      </button>
      <button type="button" onClick={() => void saveStep("housing", { housingType: "house" })}>
        save
      </button>
      {error ? <p>error: {error}</p> : null}
    </>
  );
}

/** A store whose stored household changes from outside the provider (another device, later). */
function changingStore() {
  let result: LoadResult = { kind: "none" };
  const listeners = new Set<() => void>();
  const store: HouseholdStore = {
    ...createMemoryStore(),
    load: async () => result,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    store,
    listeners,
    change(next: LoadResult) {
      result = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe("HouseholdProvider", () => {
  it("starts loading, then reports the stored state", async () => {
    render(
      <HouseholdProvider store={createMemoryStore()}>
        <Status />
      </HouseholdProvider>,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("ready")).toBeInTheDocument();
  });

  it("treats a store whose load() rejects as unavailable instead of loading forever", async () => {
    const store: HouseholdStore = {
      ...createMemoryStore(),
      load: () => Promise.reject(new Error("boom")),
    };
    render(
      <HouseholdProvider store={store}>
        <Status />
      </HouseholdProvider>,
    );
    expect(await screen.findByText("unavailable")).toBeInTheDocument();
  });

  it("re-renders with the stored household whenever the store reports a change", async () => {
    const { store, change } = changingStore();
    render(
      <HouseholdProvider store={store}>
        <Housing />
      </HouseholdProvider>,
    );
    expect(await screen.findByText("none")).toBeInTheDocument();

    await act(async () =>
      change({ kind: "found", household: completeHousehold(), planCreatedAt: null }),
    );
    expect(await screen.findByText("flat")).toBeInTheDocument();

    await act(async () =>
      change({
        kind: "found",
        household: completeHousehold({ housingType: "house" }),
        planCreatedAt: null,
      }),
    );
    expect(await screen.findByText("house")).toBeInTheDocument();

    await act(async () => change({ kind: "unavailable" }));
    expect(await screen.findByText("unavailable")).toBeInTheDocument();
  });

  it("unsubscribes when it unmounts", async () => {
    const { store, listeners } = changingStore();
    const { unmount } = render(
      <HouseholdProvider store={store}>
        <Housing />
      </HouseholdProvider>,
    );
    expect(await screen.findByText("none")).toBeInTheDocument();
    expect(listeners.size).toBe(1);
    unmount();
    expect(listeners.size).toBe(0);
  });

  it("keeps a save's result when an older read finishes after it", async () => {
    let resolveFirst: (result: LoadResult) => void = () => {};
    const memory = createMemoryStore();
    const store: HouseholdStore = {
      ...memory,
      load: () => new Promise<LoadResult>((resolve) => (resolveFirst = resolve)),
    };
    function Saver() {
      const { saveStep } = useHousehold();
      return (
        <>
          <button type="button" onClick={() => void saveStep("housing", { housingType: "house" })}>
            save
          </button>
          <Housing />
        </>
      );
    }
    render(
      <HouseholdProvider store={store}>
        <Saver />
      </HouseholdProvider>,
    );
    await act(async () => screen.getByRole("button", { name: "save" }).click());
    expect(screen.getByText("house")).toBeInTheDocument();
    await act(async () => resolveFirst({ kind: "none" }));
    expect(screen.getByText("house")).toBeInTheDocument();
  });

  describe("plan created flag", () => {
    it("reports planCreated from the store", async () => {
      render(
        <HouseholdProvider store={await storeWithPlan(completeHousehold())}>
          <PlanFlag />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("plan: yes")).toBeInTheDocument();
    });

    it("sets planCreated once markPlanCreated resolves", async () => {
      render(
        <HouseholdProvider store={createMemoryStore(completeHousehold())}>
          <PlanFlag />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("plan: no")).toBeInTheDocument();
      await act(async () => screen.getByRole("button", { name: "mark" }).click());
      expect(await screen.findByText("plan: yes")).toBeInTheDocument();
    });

    it("rejects markPlanCreated on a storage failure and keeps planCreated false", async () => {
      const store: HouseholdStore = {
        ...createMemoryStore(completeHousehold()),
        markPlanCreated: () => Promise.reject(new HouseholdStoreError("unavailable")),
      };
      render(
        <HouseholdProvider store={store}>
          <PlanFlag />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("plan: no")).toBeInTheDocument();
      await act(async () => screen.getByRole("button", { name: "mark" }).click());
      expect(await screen.findByText("error: unavailable")).toBeInTheDocument();
      expect(screen.getByText("plan: no")).toBeInTheDocument();
    });

    it("keeps planCreated true after a step save", async () => {
      // The save's own reload never finishes, so only the provider can keep the flag.
      const memory = await storeWithPlan(completeHousehold());
      let loads = 0;
      const store: HouseholdStore = {
        ...memory,
        load: () => (loads++ === 0 ? memory.load() : new Promise<LoadResult>(() => {})),
      };
      render(
        <HouseholdProvider store={store}>
          <PlanFlag />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("plan: yes")).toBeInTheDocument();
      await act(async () => screen.getByRole("button", { name: "save" }).click());
      await waitFor(() => expect(loads).toBeGreaterThan(1));
      expect(screen.getByText("plan: yes")).toBeInTheDocument();
    });
  });
});
