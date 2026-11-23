import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeHousehold } from "@/lib/household/fixtures";
import { createMemoryStore, HouseholdStoreError, type HouseholdStore } from "@/lib/household";
import { STEP_MS } from "@/features/plan/Generating";
import { Overview } from "./Overview";
import { renderScreen, storeWithPlan } from "./test-utils";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
});

const noPets = { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 };

describe("overview", () => {
  it("shows the four rows, each with a link to its step", async () => {
    renderScreen(<Overview locale="pl" />, createMemoryStore(completeHousehold()));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Profil domu" }),
    ).toBeInTheDocument();

    expect(screen.getByText("2 dorosłych, 1 dziecko · razem 3 osoby")).toBeInTheDocument();
    expect(screen.getByText("1 kot")).toBeInTheDocument();
    expect(screen.getByText("Mieszkanie w bloku")).toBeInTheDocument();
    expect(screen.getByText("Leki przyjmowane na stałe")).toBeInTheDocument();

    const hrefs = screen
      .getAllByRole("link", { name: /^Zmień: / })
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "/pl/start/people",
      "/pl/start/pets",
      "/pl/start/housing",
      "/pl/start/needs",
      "/pl/plan#sytuacje",
    ]);
  });

  it("lists the chosen emergencies by name, or says none, and changes them on Plan's sheet", async () => {
    const none = renderScreen(<Overview locale="pl" />, createMemoryStore(completeHousehold()));
    expect(await screen.findByText("Żadna — plan na 72 godziny")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zmień: Sytuacje" })).toHaveAttribute(
      "href",
      "/pl/plan#sytuacje",
    );
    none.unmount();

    const store = createMemoryStore(completeHousehold());
    await store.setEmergencies(["evacuation", "blackout", "unknown-one"]);
    renderScreen(<Overview locale="pl" />, store);
    // Content order, and an id this build doesn't know is left out.
    expect(await screen.findByText("Brak prądu, Ewakuacja")).toBeInTheDocument();
  });

  it("writes Brak for no pets and no needs, and changes pets through the people step", async () => {
    renderScreen(
      <Overview locale="pl" />,
      createMemoryStore(
        completeHousehold({
          hasPets: false,
          pets: noPets,
          needs: [],
          completedSteps: ["people", "housing", "needs"],
        }),
      ),
    );
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getAllByText("Brak")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Zmień: Zwierzęta" })).toHaveAttribute(
      "href",
      "/pl/start/people",
    );
  });

  it("forms plurals for every people group and the total", async () => {
    renderScreen(
      <Overview locale="pl" />,
      createMemoryStore(
        completeHousehold({ people: { adults: 1, seniors: 2, children: 5, smallChildren: 12 } }),
      ),
    );
    expect(
      await screen.findByText("1 dorosły, 2 seniorów, 5 dzieci, 12 małych dzieci · razem 20 osób"),
    ).toBeInTheDocument();
  });

  it("uses the few form for 22 people in total", async () => {
    renderScreen(
      <Overview locale="pl" />,
      createMemoryStore(
        completeHousehold({ people: { adults: 20, seniors: 2, children: 0, smallChildren: 0 } }),
      ),
    );
    expect(await screen.findByText(/razem 22 osoby$/)).toBeInTheDocument();
  });

  it("forms pet plurals", async () => {
    renderScreen(
      <Overview locale="pl" />,
      createMemoryStore(
        completeHousehold({
          pets: { smallDog: 1, mediumDog: 2, largeDog: 5, cat: 12, otherSmall: 20 },
        }),
      ),
    );
    expect(
      await screen.findByText(
        "1 pies mały, 2 psy średnie, 5 psów dużych, 12 kotów, 20 innych małych zwierząt",
      ),
    ).toBeInTheDocument();
  });

  it("continues at the first unfinished step when the profile is not complete", async () => {
    renderScreen(
      <Overview locale="pl" />,
      createMemoryStore(
        completeHousehold({
          status: "draft",
          housingType: null,
          completedSteps: ["people", "pets"],
        }),
      ),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/pl/start/housing"));
  });

  it("opens the intro when nothing is saved", async () => {
    renderScreen(<Overview locale="pl" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/pl/start"));
  });

  it("names its status chip", async () => {
    renderScreen(<Overview locale="pl" />, createMemoryStore(completeHousehold()));
    expect(await screen.findByText("Zapisane", { exact: true })).toBeInTheDocument();
  });
});

/** Long enough for every generating step and the save to finish. */
const RUN_MS = STEP_MS * 4 + 1000;

describe("overview: the way into the plan", () => {
  it("offers Stwórz plan before a plan exists, with the line about counting on this phone", async () => {
    renderScreen(<Overview locale="pl" />, createMemoryStore(completeHousehold()));
    expect(await screen.findByRole("button", { name: "Stwórz plan" })).toBeInTheDocument();
    expect(
      screen.getByText("Wszystko jest gotowe do planu. Plan liczy się na tym telefonie."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pokaż plan" })).not.toBeInTheDocument();
  });

  it("links Pokaż plan to the plan once this device has created one", async () => {
    renderScreen(<Overview locale="pl" />, await storeWithPlan(completeHousehold()));
    expect(await screen.findByRole("link", { name: "Pokaż plan" })).toHaveAttribute(
      "href",
      "/pl/plan",
    );
    expect(screen.queryByRole("button", { name: "Stwórz plan" })).not.toBeInTheDocument();
  });

  it("runs the generating steps, stores the flag, then opens the plan", async () => {
    const store = createMemoryStore(completeHousehold());
    const mark = vi.spyOn(store, "markPlanCreated");
    renderScreen(<Overview locale="pl" />, store);
    await userEvent.click(await screen.findByRole("button", { name: "Stwórz plan" }));

    expect(screen.getByRole("heading", { level: 1, name: "Liczenie planu" })).toBeInTheDocument();
    for (const step of [
      "Dopasowanie do domowników",
      "Liczenie ilości",
      "Układanie kolejności",
      "Zapisywanie planu",
    ]) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }
    expect(mark).not.toHaveBeenCalled();

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/pl/plan"), {
      timeout: RUN_MS,
    });
    expect(mark).toHaveBeenCalledTimes(1);
    const loaded = await store.load();
    expect(loaded.kind === "found" && loaded.planCreatedAt).toBeTruthy();
  });

  it("shows the save error and stays when the flag can't be stored", async () => {
    const failing: HouseholdStore = {
      ...createMemoryStore(completeHousehold()),
      markPlanCreated: vi.fn().mockRejectedValue(new HouseholdStoreError("unavailable")),
    };
    renderScreen(<Overview locale="pl" />, failing);
    await userEvent.click(await screen.findByRole("button", { name: "Stwórz plan" }));

    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: "Nie udało się zapisać" },
        { timeout: RUN_MS },
      ),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Wróć do formularza" }));
    expect(await screen.findByRole("button", { name: "Stwórz plan" })).toBeInTheDocument();
  });

  it("starts one run on a double tap", async () => {
    const store = createMemoryStore(completeHousehold());
    const mark = vi.spyOn(store, "markPlanCreated");
    renderScreen(<Overview locale="pl" />, store);
    await userEvent.dblClick(await screen.findByRole("button", { name: "Stwórz plan" }));

    await waitFor(() => expect(router.push).toHaveBeenCalled(), { timeout: RUN_MS });
    expect(mark).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it("never navigates or writes after it is closed mid-run", async () => {
    let resolveMark: () => void = () => {};
    const store: HouseholdStore = {
      ...createMemoryStore(completeHousehold()),
      markPlanCreated: vi.fn(() => new Promise<void>((resolve) => (resolveMark = resolve))),
    };
    const { unmount } = renderScreen(<Overview locale="pl" />, store);
    await userEvent.click(await screen.findByRole("button", { name: "Stwórz plan" }));
    unmount();

    await new Promise((resolve) => setTimeout(resolve, STEP_MS * 4));
    expect(store.markPlanCreated).not.toHaveBeenCalled();
    resolveMark();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("ignores a save that settles after the screen closed", async () => {
    let resolveMark: () => void = () => {};
    const store: HouseholdStore = {
      ...createMemoryStore(completeHousehold()),
      markPlanCreated: vi.fn(() => new Promise<void>((resolve) => (resolveMark = resolve))),
    };
    const { unmount } = renderScreen(<Overview locale="pl" />, store);
    await userEvent.click(await screen.findByRole("button", { name: "Stwórz plan" }));
    await waitFor(() => expect(store.markPlanCreated).toHaveBeenCalled(), { timeout: RUN_MS });
    unmount();
    resolveMark();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(router.push).not.toHaveBeenCalled();
  });
});
