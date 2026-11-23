import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderScreen } from "@/features/household/test-utils";
import { messages } from "@/i18n/messages";
import { createMemoryStore, summarise, type HouseholdStore } from "@/lib/household";
import { completeHousehold } from "@/lib/household/fixtures";
import { addedItemCount, EMERGENCIES } from "@/lib/plan";
import { PLAN_DAYS } from "./format";
import { PlanScreen } from "./PlanScreen";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/pl/plan" }));

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
  window.history.replaceState(null, "", "/pl/plan");
});

const noPets = { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 };

/** Two adults and a medium dog, in a flat. */
const household = () =>
  completeHousehold({
    people: { adults: 2, seniors: 0, children: 0, smallChildren: 0 },
    pets: { ...noPets, mediumDog: 1 },
    needs: [],
  });

const renderPlan = (store: HouseholdStore) => renderScreen(<PlanScreen locale="pl" />, store);

/** The sheet's <dialog>, open or not (a closed dialog has no role in the accessibility tree). */
const sheet = () =>
  [...document.querySelectorAll("dialog")].find(
    (dialog) => dialog.querySelector("h2")?.textContent === "Sytuacje",
  ) as HTMLDialogElement;
const openSheet = async (name = "Dodaj sytuację") => {
  await userEvent.click(await screen.findByRole("button", { name }));
  return within(sheet());
};
const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("emergency messages", () => {
  it("has a caption form for every scenario", () => {
    for (const { id } of EMERGENCIES) {
      expect(messages.plan.emergencies.ui.accusative).toHaveProperty(id);
    }
  });
});

describe("plan: the emergencies panel and sheet", () => {
  it("says the plan covers 72 hours for any situation when none is chosen", async () => {
    renderPlan(createMemoryStore(household()));
    expect(await screen.findByRole("heading", { level: 2, name: "Sytuacje" })).toBeInTheDocument();
    expect(screen.getByText(/^Plan na 72 godziny sprawdza się w każdej sytuacji/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Dodaj sytuację" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists the five emergencies with a disclosure that does not tick them", async () => {
    renderPlan(createMemoryStore(household()));
    const inSheet = await openSheet();
    expect(inSheet.getAllByRole("checkbox")).toHaveLength(5);
    expect(inSheet.getByText("Bez sytuacji plan zostaje podstawą na 72 godziny.")).toBeVisible();

    const [first] = inSheet.getAllByRole("button", { name: "Co dodaje?" });
    await userEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAccessibleName("Zwiń");
    expect(inSheet.getByRole("checkbox", { name: "Brak prądu" })).not.toBeChecked();
    const details = within(document.getElementById(first.getAttribute("aria-controls")!)!);
    expect(details.getByText("Dodaje do planu")).toBeVisible();
    expect(details.getByText("Świeczki i zapalniczka")).toBeVisible();
    expect(details.getByText("Źródło: rekomendacja PREPWISE")).toBeVisible();
  });

  it("counts the draft in the footer and saves it on Gotowe, then notes what was added", async () => {
    const store = createMemoryStore(household());
    renderPlan(store);
    const inSheet = await openSheet();

    await userEvent.click(inSheet.getByRole("checkbox", { name: "Brak prądu" }));
    expect(inSheet.getByText("Dojdzie 3 rzeczy do planu.")).toBeVisible();
    // Nothing is stored until Gotowe.
    expect(await store.load()).toMatchObject({ emergencies: [] });

    await userEvent.click(inSheet.getByRole("button", { name: "Gotowe" }));

    await waitFor(() => expect(sheet()).not.toHaveAttribute("open"));
    expect(await store.load()).toMatchObject({ emergencies: ["blackout"] });
    expect(screen.getByRole("heading", { level: 2, name: "Sytuacje w planie" })).toBeVisible();
    expect(screen.getAllByText("Dodano 3 rzeczy do planu.")).toHaveLength(2);
    // Tagged in its tier, with the spoken lead.
    const row = within(document.getElementById("tier-2")!)
      .getByText("Świeczki i zapalniczka")
      .closest("li")!;
    expect(within(row).getByText("dodane na sytuację:")).toBeInTheDocument();
    expect(within(row).getByText("Brak prądu")).toBeInTheDocument();
    // Focus goes back to the panel's button, which is now "Zmień".
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Zmień sytuacje w planie" })).toHaveFocus(),
    );
  });

  it("counts a swap by what the new emergency brings, and says nothing when nothing is added", () => {
    const summary = summarise(household());
    expect(addedItemCount(summary, PLAN_DAYS, ["blackout"], ["severe-weather"])).toBeGreaterThan(0);
    expect(addedItemCount(summary, PLAN_DAYS, ["blackout"], [])).toBe(0);
  });

  it("shows no note after removing an emergency", async () => {
    const store = createMemoryStore(household());
    await store.setEmergencies(["blackout"]);
    renderPlan(store);
    const inSheet = await openSheet("Zmień sytuacje w planie");
    expect(inSheet.getByRole("checkbox", { name: "Brak prądu" })).toBeChecked();
    await userEvent.click(inSheet.getByRole("checkbox", { name: "Brak prądu" }));
    expect(inSheet.getByText("Bez sytuacji plan zostaje podstawą na 72 godziny.")).toBeVisible();
    await userEvent.click(inSheet.getByRole("button", { name: "Gotowe" }));

    await waitFor(() => expect(sheet()).not.toHaveAttribute("open"));
    expect(await store.load()).toMatchObject({ emergencies: [] });
    expect(screen.queryByText(/^Dodano /)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Sytuacje" })).toBeVisible();
  });

  it("discards the draft on X and on Escape", async () => {
    const store = createMemoryStore(household());
    renderPlan(store);
    let inSheet = await openSheet();
    await userEvent.click(inSheet.getByRole("checkbox", { name: "Powódź" }));
    await userEvent.click(inSheet.getByRole("button", { name: "Zamknij" }));
    expect(sheet()).not.toHaveAttribute("open");
    expect(await store.load()).toMatchObject({ emergencies: [] });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Dodaj sytuację" })).toHaveFocus(),
    );

    // Reopened, the draft starts from what is stored.
    inSheet = await openSheet();
    expect(inSheet.getByRole("checkbox", { name: "Powódź" })).not.toBeChecked();
    await userEvent.click(inSheet.getByRole("checkbox", { name: "Powódź" }));
    fireEvent(sheet(), new Event("cancel", { cancelable: true }));
    expect(sheet()).not.toHaveAttribute("open");
    expect(await store.load()).toMatchObject({ emergencies: [] });
  });

  it("disables Gotowe while saving, saves once and closes after it resolves", async () => {
    const store = createMemoryStore(household());
    const save = deferred();
    const setEmergencies = vi.fn(() => save.promise);
    renderPlan({ ...store, setEmergencies });
    const inSheet = await openSheet();
    await userEvent.click(inSheet.getByRole("checkbox", { name: "Ewakuacja" }));

    const done = inSheet.getByRole("button", { name: "Gotowe" });
    await userEvent.click(done);
    expect(inSheet.getByText("Zapisywanie…")).toBeVisible();
    expect(inSheet.getByRole("button", { name: "Gotowe" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await userEvent.click(inSheet.getByRole("button", { name: "Gotowe" }));
    expect(setEmergencies).toHaveBeenCalledTimes(1);
    expect(setEmergencies).toHaveBeenCalledWith(["evacuation"]);
    // Still open, and no note yet.
    expect(sheet()).toHaveAttribute("open");
    expect(screen.queryByText(/^Dodano /)).not.toBeInTheDocument();

    await act(async () => save.resolve());
    await waitFor(() => expect(sheet()).not.toHaveAttribute("open"));
    expect(screen.getAllByText(/^Dodano \d+ rzeczy do planu\.$/).length).toBeGreaterThan(0);
  });

  it("shows no note when the sheet was closed while the save ran", async () => {
    const store = createMemoryStore(household());
    const save = deferred();
    renderPlan({ ...store, setEmergencies: () => save.promise });
    const inSheet = await openSheet();
    await userEvent.click(inSheet.getByRole("checkbox", { name: "Brak prądu" }));
    await userEvent.click(inSheet.getByRole("button", { name: "Gotowe" }));
    await userEvent.click(inSheet.getByRole("button", { name: "Zamknij" }));
    expect(sheet()).not.toHaveAttribute("open");

    await act(async () => save.resolve());
    expect(screen.queryByText(/^Dodano /)).not.toBeInTheDocument();
    expect(sheet()).not.toHaveAttribute("open");
  });

  it("keeps the draft and offers a retry when saving fails", async () => {
    const store = createMemoryStore(household());
    const setEmergencies = vi
      .fn<HouseholdStore["setEmergencies"]>()
      .mockRejectedValueOnce(new Error("storage"))
      .mockImplementation((ids) => store.setEmergencies(ids));
    renderPlan({ ...store, setEmergencies });
    const inSheet = await openSheet();
    await userEvent.click(inSheet.getByRole("checkbox", { name: "Powódź" }));
    await userEvent.click(inSheet.getByRole("button", { name: "Gotowe" }));

    const alert = await inSheet.findByRole("alert");
    expect(alert).toHaveTextContent("Nie udało się zapisać sytuacji");
    expect(sheet()).toHaveAttribute("open");
    expect(inSheet.getByRole("checkbox", { name: "Powódź" })).toBeChecked();
    expect(inSheet.queryByRole("button", { name: "Gotowe" })).not.toBeInTheDocument();

    await userEvent.click(inSheet.getByRole("button", { name: "Spróbuj ponownie" }));
    await waitFor(() => expect(sheet()).not.toHaveAttribute("open"));
    expect(await store.load()).toMatchObject({ emergencies: ["flood"] });
  });

  it("opens the sheet from #sytuacje, clears the hash and returns focus to the panel", async () => {
    window.history.replaceState(null, "", "/pl/plan#sytuacje");
    renderPlan(createMemoryStore(household()));
    await waitFor(() => expect(sheet()).toHaveAttribute("open"));
    expect(window.location.hash).toBe("");

    await userEvent.click(within(sheet()).getByRole("button", { name: "Zamknij" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Dodaj sytuację" })).toHaveFocus(),
    );
  });

  it("leaves #sytuacje alone while the household loads, then opens the sheet", async () => {
    window.history.replaceState(null, "", "/pl/plan#sytuacje");
    const store = createMemoryStore(household());
    const loaded = deferred();
    const load: HouseholdStore["load"] = async () => {
      await loaded.promise;
      return store.load();
    };
    renderPlan({ ...store, load });
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(window.location.hash).toBe("#sytuacje");

    await act(async () => loaded.resolve());
    await waitFor(() => expect(sheet()).toHaveAttribute("open"));
    expect(window.location.hash).toBe("");
  });

  it("opens the sheet when the hash changes on a plan that is already showing", async () => {
    renderPlan(createMemoryStore(household()));
    await screen.findByRole("button", { name: "Dodaj sytuację" });
    window.history.replaceState(null, "", "/pl/plan#sytuacje");
    fireEvent(window, new HashChangeEvent("hashchange"));
    await waitFor(() => expect(sheet()).toHaveAttribute("open"));
    expect(window.location.hash).toBe("");
  });

  it("tags the backpack once in its header, after the other sections, with two list bars", async () => {
    const store = createMemoryStore(household());
    await store.setEmergencies(["flood", "evacuation"]);
    await store.markListCreated();
    renderPlan(store);

    const heading = await screen.findByRole("heading", { level: 2, name: "Plecak ewakuacyjny" });
    const section = document.getElementById("section-backpack")!;
    expect(section).toContainElement(heading);
    // One tag per emergency in the header, none on the rows.
    expect(within(section).getAllByText("dodane na sytuację:")).toHaveLength(1);
    expect(within(section).getAllByText("Powódź")).toHaveLength(1);
    expect(within(section).getAllByText("Ewakuacja")).toHaveLength(1);
    // Sections: the dog's, then the backpack.
    const sections = [...document.querySelectorAll("section[id^='section-']")].map((el) => el.id);
    expect(sections).toEqual(["section-pets", "section-backpack"]);

    expect(screen.getByText("Zapasy w domu")).toBeInTheDocument();
    expect(screen.getAllByText("Plecak ewakuacyjny").length).toBeGreaterThan(1);
    expect(screen.getAllByText(/^Gotowe 0 z \d+$/)).toHaveLength(2);
  });

  it("leaves sandbags out of a flat's flood explanation", async () => {
    renderPlan(createMemoryStore(household()));
    const inSheet = await openSheet();
    const buttons = inSheet.getAllByRole("button", { name: "Co dodaje?" });
    await userEvent.click(buttons[3]);
    expect(inSheet.queryByText("Worki z piaskiem")).not.toBeInTheDocument();
  });
});
