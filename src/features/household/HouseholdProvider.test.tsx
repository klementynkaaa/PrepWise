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

/** A `found` load result for the complete household, with nothing ticked and no flags. */
function found(overrides: Partial<Extract<LoadResult, { kind: "found" }>> = {}): LoadResult {
  return {
    kind: "found",
    household: completeHousehold(),
    ticks: [],
    emergencies: [],
    planCreatedAt: null,
    listCreatedAt: null,
    ...overrides,
  };
}

function ListState() {
  const { status, ticks, planCreated, listCreated, setTick, markListCreated, saveStep } =
    useHousehold();
  const [error, setError] = useState<string | null>(null);
  const fail = (e: unknown) => setError(e instanceof HouseholdStoreError ? e.code : "other");
  return (
    <>
      <p>
        {status === "ready"
          ? `plan: ${planCreated ? "yes" : "no"}, list: ${listCreated ? "yes" : "no"}`
          : status}
      </p>
      <p>
        ticks: {ticks.map((t) => `${t.item}=${t.selected ? "on" : "off"}@${t.quantity}`).join(",")}
      </p>
      <button type="button" onClick={() => void setTick("candles", true, 2).catch(fail)}>
        tick
      </button>
      <button type="button" onClick={() => void setTick("candles", false, 2).catch(fail)}>
        untick
      </button>
      <button type="button" onClick={() => void markListCreated().catch(fail)}>
        create list
      </button>
      <button type="button" onClick={() => void saveStep("housing", { housingType: "house" })}>
        save
      </button>
      {error ? <p>error: {error}</p> : null}
    </>
  );
}

function EmergencyState() {
  const { status, emergencies, setEmergencies, saveStep } = useHousehold();
  const [error, setError] = useState<string | null>(null);
  const fail = (e: unknown) => setError(e instanceof HouseholdStoreError ? e.code : "other");
  return (
    <>
      <p>{status === "ready" ? `emergencies: ${emergencies.join(",")}` : status}</p>
      <button type="button" onClick={() => void setEmergencies(["blackout", "flood"]).catch(fail)}>
        choose
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

    await act(async () => change(found()));
    expect(await screen.findByText("flat")).toBeInTheDocument();

    await act(async () =>
      change(found({ household: completeHousehold({ housingType: "house" }) })),
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

  describe("ticks and the list created flag", () => {
    it("reports no list and no ticks for a fresh household", async () => {
      render(
        <HouseholdProvider store={createMemoryStore(completeHousehold())}>
          <ListState />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("plan: no, list: no")).toBeInTheDocument();
      expect(screen.getByText("ticks:")).toBeInTheDocument();
    });

    it("reports the list from this device's flag, and the plan with it", async () => {
      const { store, change } = changingStore();
      render(
        <HouseholdProvider store={store}>
          <ListState />
        </HouseholdProvider>,
      );
      await act(async () => change(found({ listCreatedAt: "2026-01-02T03:04:05.000Z" })));
      expect(await screen.findByText("plan: yes, list: yes")).toBeInTheDocument();
    });

    it("reports the list and the plan when ticks arrive without either flag (a member, a reinstall)", async () => {
      const { store, change } = changingStore();
      render(
        <HouseholdProvider store={store}>
          <ListState />
        </HouseholdProvider>,
      );
      await act(async () =>
        change(found({ ticks: [{ item: "candles", selected: true, quantity: 2 }] })),
      );
      expect(await screen.findByText("plan: yes, list: yes")).toBeInTheDocument();
      expect(screen.getByText("ticks: candles=on@2")).toBeInTheDocument();
    });

    it("does not count only unticked rows as a list", async () => {
      const { store, change } = changingStore();
      render(
        <HouseholdProvider store={store}>
          <ListState />
        </HouseholdProvider>,
      );
      await act(async () =>
        change(found({ ticks: [{ item: "candles", selected: false, quantity: 2 }] })),
      );
      expect(await screen.findByText("plan: no, list: no")).toBeInTheDocument();
    });

    it("sets listCreated and planCreated once markListCreated resolves", async () => {
      render(
        <HouseholdProvider store={createMemoryStore(completeHousehold())}>
          <ListState />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("plan: no, list: no")).toBeInTheDocument();
      await act(async () => screen.getByRole("button", { name: "create list" }).click());
      expect(await screen.findByText("plan: yes, list: yes")).toBeInTheDocument();
    });

    it("rejects markListCreated on a storage failure and keeps listCreated false", async () => {
      const store: HouseholdStore = {
        ...createMemoryStore(completeHousehold()),
        markListCreated: () => Promise.reject(new HouseholdStoreError("unavailable")),
      };
      render(
        <HouseholdProvider store={store}>
          <ListState />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("plan: no, list: no")).toBeInTheDocument();
      await act(async () => screen.getByRole("button", { name: "create list" }).click());
      expect(await screen.findByText("error: unavailable")).toBeInTheDocument();
      expect(screen.getByText("plan: no, list: no")).toBeInTheDocument();
    });

    it("shows the stored ticks after setTick resolves, even without a store event", async () => {
      const memory = createMemoryStore(completeHousehold());
      // No subscribe events: only setTick's own reload can show the new ticks.
      const store: HouseholdStore = { ...memory, subscribe: () => () => {} };
      render(
        <HouseholdProvider store={store}>
          <ListState />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("ticks:")).toBeInTheDocument();
      await act(async () => screen.getByRole("button", { name: "tick" }).click());
      expect(await screen.findByText("ticks: candles=on@2")).toBeInTheDocument();
      expect(screen.getByText("plan: yes, list: yes")).toBeInTheDocument();
      await act(async () => screen.getByRole("button", { name: "untick" }).click());
      expect(await screen.findByText("ticks: candles=off@2")).toBeInTheDocument();
    });

    it("keeps the screen when the read after a saved tick fails", async () => {
      const memory = createMemoryStore(completeHousehold());
      let failLoad = false;
      const store: HouseholdStore = {
        ...memory,
        load: () => (failLoad ? Promise.reject(new Error("read failed")) : memory.load()),
        setTick: async (...args) => {
          await memory.setTick(...args);
          failLoad = true;
        },
        subscribe: () => () => {},
      };
      render(
        <HouseholdProvider store={store}>
          <ListState />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("plan: no, list: no")).toBeInTheDocument();
      await act(async () => screen.getByRole("button", { name: "tick" }).click());
      expect(screen.getByText("plan: no, list: no")).toBeInTheDocument();
      expect(screen.queryByText("unavailable")).not.toBeInTheDocument();
      expect(screen.queryByText(/^error:/)).not.toBeInTheDocument();
    });

    it("rejects setTick on a storage failure and changes nothing on screen", async () => {
      const store: HouseholdStore = {
        ...createMemoryStore(completeHousehold()),
        setTick: () => Promise.reject(new HouseholdStoreError("unavailable")),
      };
      render(
        <HouseholdProvider store={store}>
          <ListState />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("plan: no, list: no")).toBeInTheDocument();
      await act(async () => screen.getByRole("button", { name: "tick" }).click());
      expect(await screen.findByText("error: unavailable")).toBeInTheDocument();
      expect(screen.getByText("ticks:")).toBeInTheDocument();
      expect(screen.getByText("plan: no, list: no")).toBeInTheDocument();
    });

    it("keeps the ticks and listCreated after a step save", async () => {
      // The save's own reload never finishes, so only the provider can keep them.
      const memory = createMemoryStore(completeHousehold());
      await memory.setTick("candles", true, 2);
      let loads = 0;
      const store: HouseholdStore = {
        ...memory,
        load: () => (loads++ === 0 ? memory.load() : new Promise<LoadResult>(() => {})),
      };
      render(
        <HouseholdProvider store={store}>
          <ListState />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("plan: yes, list: yes")).toBeInTheDocument();
      await act(async () => screen.getByRole("button", { name: "save" }).click());
      await waitFor(() => expect(loads).toBeGreaterThan(1));
      expect(screen.getByText("plan: yes, list: yes")).toBeInTheDocument();
      expect(screen.getByText("ticks: candles=on@2")).toBeInTheDocument();
    });
  });

  describe("emergencies", () => {
    it("reports the stored emergencies, none for a fresh household", async () => {
      const { store, change } = changingStore();
      render(
        <HouseholdProvider store={store}>
          <EmergencyState />
        </HouseholdProvider>,
      );
      await act(async () => change(found()));
      expect(await screen.findByText("emergencies:")).toBeInTheDocument();
      await act(async () => change(found({ emergencies: ["flood"] })));
      expect(await screen.findByText("emergencies: flood")).toBeInTheDocument();
    });

    it("shows the stored selection after setEmergencies resolves, even without a store event", async () => {
      const memory = createMemoryStore(completeHousehold());
      const store: HouseholdStore = { ...memory, subscribe: () => () => {} };
      render(
        <HouseholdProvider store={store}>
          <EmergencyState />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("emergencies:")).toBeInTheDocument();
      await act(async () => screen.getByRole("button", { name: "choose" }).click());
      expect(await screen.findByText("emergencies: blackout,flood")).toBeInTheDocument();
    });

    it("rejects setEmergencies on a storage failure and changes nothing on screen", async () => {
      const store: HouseholdStore = {
        ...createMemoryStore(completeHousehold()),
        setEmergencies: () => Promise.reject(new HouseholdStoreError("unavailable")),
      };
      render(
        <HouseholdProvider store={store}>
          <EmergencyState />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("emergencies:")).toBeInTheDocument();
      await act(async () => screen.getByRole("button", { name: "choose" }).click());
      expect(await screen.findByText("error: unavailable")).toBeInTheDocument();
      expect(screen.getByText("emergencies:")).toBeInTheDocument();
    });

    it("keeps the emergencies after a step save", async () => {
      // The save's own reload never finishes, so only the provider can keep them.
      const memory = createMemoryStore(completeHousehold());
      await memory.setEmergencies(["flood"]);
      let loads = 0;
      const store: HouseholdStore = {
        ...memory,
        load: () => (loads++ === 0 ? memory.load() : new Promise<LoadResult>(() => {})),
      };
      render(
        <HouseholdProvider store={store}>
          <EmergencyState />
        </HouseholdProvider>,
      );
      expect(await screen.findByText("emergencies: flood")).toBeInTheDocument();
      await act(async () => screen.getByRole("button", { name: "save" }).click());
      await waitFor(() => expect(loads).toBeGreaterThan(1));
      expect(screen.getByText("emergencies: flood")).toBeInTheDocument();
    });
  });
});
