import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStore, summarise, type HouseholdStore } from "@/lib/household";
import { buildList } from "@/lib/list";
import { buildPlan } from "@/lib/plan";
import { PLAN_DAYS } from "@/features/plan/format";
import { completeHousehold } from "@/lib/household/fixtures";
import { renderScreen, storeWithPlan } from "@/features/household/test-utils";
import { StartScreen } from "./StartScreen";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/pl/home" }));

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
});

const noPets = { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 };

/** The agreed default: 2 adults, a small child, a medium dog; medicines and diet; a flat. */
const defaultHousehold = () =>
  completeHousehold({
    people: { adults: 2, seniors: 0, children: 0, smallChildren: 1 },
    pets: { ...noPets, mediumDog: 1 },
    needs: ["regularMedicines", "specialDiet"],
  });

const renderStart = (store: HouseholdStore) => renderScreen(<StartScreen locale="pl" />, store);

/** A tile's link name: its words, with any soft hyphen. */
const tile = (name: RegExp) => screen.getByRole("link", { name });

describe("start screen", () => {
  it("shows the household banner with a way to change the profile", async () => {
    renderStart(await storeWithPlan(defaultHousehold()));
    expect(await screen.findByRole("heading", { level: 2, name: "Wasz dom" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Start" })).toBeInTheDocument();
    expect(screen.getByText("2 dorosłych, 1 małe dziecko i 1 pies.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zmień profil domu" })).toHaveAttribute(
      "href",
      "/pl/household",
    );
  });

  it("shows the steps to do, the current one leading to the plan before the list exists", async () => {
    renderStart(await storeWithPlan(defaultHousehold()));
    expect(
      await screen.findByRole("heading", { level: 2, name: "Do zrobienia" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Krok 2 z 2")).toBeInTheDocument();
    const steps = within(screen.getByText("Plan gotowy").closest("ol")!).getAllByRole("listitem");
    expect(steps).toHaveLength(2);
    expect(steps[0]).toHaveTextContent("Plan gotowy");
    expect(within(steps[0]).getByText("zrobione")).toBeInTheDocument();
    expect(within(steps[1]).getByText("Skompletuj zapasy")).toBeInTheDocument();
    expect(within(steps[1]).getByText("teraz")).toBeInTheDocument();
    expect(
      within(steps[1]).getByText(
        "Najpierw rzeczy z priorytetu 1: woda, jedzenie, leki i apteczka.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Otwórz plan" })).toHaveAttribute("href", "/pl/plan");
  });

  it("shows one tile per tier and member section, with counts, linking to the plan", async () => {
    renderStart(await storeWithPlan(defaultHousehold()));
    expect(
      await screen.findByRole("heading", { level: 2, name: "Plan na 72 godziny" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cały plan" })).toHaveAttribute("href", "/pl/plan");

    const tiles = [
      [/^Priorytet 1:\s*Najważniej\u00adsze\s*\d+ rzecz/, "/pl/plan#tier-1"],
      [/^Priorytet 2:\s*Codzien\u00adność\s*\d+ rzecz/, "/pl/plan#tier-2"],
      [/^Priorytet 3:\s*Dodatkowo\s*\d+ rzecz/, "/pl/plan#tier-3"],
      [/^Dla dziecka\s*\d+ rzecz/, "/pl/plan#section-smallChild"],
      [/^Dla psa\s*\d+ rzecz/, "/pl/plan#section-pets"],
    ] as const;
    for (const [name, href] of tiles) {
      expect(tile(name)).toHaveAttribute("href", href);
    }
    // Pointer rows are not items: the child section counts its own rows only.
    expect(within(tile(/^Dla dziecka/)).getByText(/^\d+ rzecz/).textContent).toMatch(/^[1-9]/);
  });

  it("shows the readiness panel and the current step once the list exists", async () => {
    const store = await storeWithPlan(defaultHousehold());
    await store.markListCreated();
    // Water counts; food ticked at less than it needs now does not.
    await store.setTick("drinking-water", true, 27);
    await store.setTick("shelf-stable-food", true, 0);
    renderStart(store);

    const readiness = await screen.findByRole("heading", {
      level: 2,
      name: "Gotowość na 72 godziny",
    });
    // The section's header link "Plan", besides the tab of the same name.
    const planLinks = screen.getAllByRole("link", { name: "Plan" });
    expect(planLinks.filter((link) => !link.closest("nav"))).toHaveLength(1);
    for (const link of planLinks) expect(link).toHaveAttribute("href", "/pl/plan");

    // A ring with the percentage, the count in words and a short sentence; no rows without a backpack.
    expect(screen.getByText("4%")).toBeInTheDocument();
    expect(screen.getByText("Gotowe 1 z 22")).toBeInTheDocument();
    expect(screen.getByText("Dobrze idzie. Zostało 21 rzeczy.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Zapasy w domu/ })).not.toBeInTheDocument();

    // Right after the banner, before "Do zrobienia".
    const todo = screen.getByRole("heading", { level: 2, name: "Do zrobienia" });
    expect(readiness.compareDocumentPosition(todo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Krok 2 z 2")).toBeInTheDocument();
    expect(screen.getByText("Zostało 21 rzeczy z listy zakupów.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Otwórz listę zakupów" })).toHaveAttribute(
      "href",
      "/pl/list",
    );
    expect(screen.queryByText("Najpierw rzeczy z priorytetu 1", { exact: false })).toBeNull();
    // The tiles give way to the panel.
    expect(screen.queryByRole("heading", { name: "Plan na 72 godziny" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Priorytet \d:/ })).not.toBeInTheDocument();
  });

  it("starts the sentence with where to begin when nothing is ticked", async () => {
    const store = await storeWithPlan(defaultHousehold());
    await store.markListCreated();
    renderStart(store);
    expect(await screen.findByText("Gotowe 0 z 22")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("Zacznij od najważniejszych rzeczy z listy.")).toBeInTheDocument();
  });

  it("shows a row per part, each its own link to the list, when the plan has a backpack", async () => {
    const store = await storeWithPlan(defaultHousehold());
    await store.markListCreated();
    await store.setEmergencies(["evacuation"]);
    await store.setTick("drinking-water", true, 27);
    renderStart(store);

    const home = await screen.findByRole("link", { name: /^Zapasy w domu 1 z 22$/ });
    expect(home).toHaveAttribute("href", "/pl/list");
    const backpack = screen.getByRole("link", { name: /^Plecak ewakuacyjny 0 z \d+$/ });
    expect(backpack).toHaveAttribute("href", "/pl/list");
    expect(screen.getByText(/^Gotowe 1 z \d+$/)).toBeInTheDocument();
    expect(screen.getByText("Krok 2 z 3")).toBeInTheDocument();
    const steps = within(screen.getByText("Plan gotowy").closest("ol")!).getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(within(steps[2]).getByText("później")).toBeInTheDocument();
    expect(within(steps[2]).getByText(/rzeczy na szybkie wyjście\.$/)).toBeInTheDocument();
  });

  it("makes the backpack the current step once home supplies are ticked, and is not complete yet", async () => {
    const household = defaultHousehold();
    const store = await storeWithPlan(household);
    await store.markListCreated();
    await store.setEmergencies(["evacuation"]);
    const list = buildList(buildPlan(summarise(household), PLAN_DAYS, ["evacuation"]), []);
    for (const row of list.groups.filter((g) => g.kind !== "backpack").flatMap((g) => g.rows)) {
      await store.setTick(row.itemId, true, row.quantity);
    }
    renderStart(store);
    expect(await screen.findByText("Krok 3 z 3")).toBeInTheDocument();
    const steps = within(screen.getByText("Plan gotowy").closest("ol")!).getAllByRole("listitem");
    expect(within(steps[1]).getByText("zrobione")).toBeInTheDocument();
    expect(within(steps[2]).getByText("teraz")).toBeInTheDocument();
    expect(within(steps[2]).getByRole("link", { name: "Otwórz listę zakupów" })).toHaveAttribute(
      "href",
      "/pl/list",
    );
    expect(screen.queryByText("Zapasy na 72 godziny gotowe")).not.toBeInTheDocument();
  });

  it("links the backpack tile to its section before the list exists", async () => {
    const store = await storeWithPlan(defaultHousehold());
    await store.setEmergencies(["evacuation"]);
    renderStart(store);
    expect(await screen.findByRole("link", { name: /^Plecak ewakuacyjny/ })).toHaveAttribute(
      "href",
      "/pl/plan#section-backpack",
    );
    expect(screen.getByText("Krok 2 z 3")).toBeInTheDocument();
  });

  it("marks every step done once everything on the list is ticked", async () => {
    const household = defaultHousehold();
    const store = await storeWithPlan(household);
    await store.markListCreated();
    const list = buildList(buildPlan(summarise(household), PLAN_DAYS), []);
    for (const row of list.groups.flatMap((group) => group.rows)) {
      await store.setTick(row.itemId, true, row.quantity);
    }
    renderStart(store);

    expect(await screen.findByText("Zapasy na 72 godziny gotowe")).toBeInTheDocument();
    expect(
      screen.getByText("Raz na pół roku warto sprawdzić daty ważności wody, jedzenia i leków."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Krok \d z \d$/)).not.toBeInTheDocument();
    const steps = within(screen.getByText("Plan gotowy").closest("ol")!).getAllByRole("listitem");
    for (const step of steps) expect(within(step).getByText("zrobione")).toBeInTheDocument();
    expect(screen.getByText("Gotowe 22 z 22")).toBeInTheDocument();
    expect(screen.getByText("Wszystko odhaczone.", { selector: "p" })).toBeInTheDocument();
    // The full ring shows a check mark instead of the percentage.
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
  });

  it("leaves the section tiles out when the plan has no sections", async () => {
    renderStart(
      await storeWithPlan(
        completeHousehold({
          people: { adults: 1, seniors: 0, children: 0, smallChildren: 0 },
          hasPets: false,
          pets: noPets,
          needs: [],
          completedSteps: ["people", "housing", "needs"],
        }),
      ),
    );
    expect(await screen.findByText("1 dorosły.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Priorytet \d:/ })).toHaveLength(3);
    expect(screen.queryByRole("link", { name: /^Dla / })).not.toBeInTheDocument();
  });

  it("shows the Online chip and the Start · Plan · Lista tabs", async () => {
    renderStart(await storeWithPlan(defaultHousehold()));
    await screen.findByText("Wasz dom");
    expect(screen.getByText("Online")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Główna nawigacja" });
    expect(within(nav).getByRole("link", { name: "Start" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Plan" })).toHaveAttribute("href", "/pl/plan");
    expect(within(nav).getByRole("link", { name: "Lista" })).toHaveAttribute("href", "/pl/list");
  });

  it("opens the overview when this device has not created a plan", async () => {
    renderStart(createMemoryStore(defaultHousehold()));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/pl/household"));
    expect(screen.queryByText("Wasz dom")).not.toBeInTheDocument();
  });

  it("continues at the first unfinished step when the profile is not complete", async () => {
    renderStart(
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

  it("holds the page with a skeleton while storage is read", async () => {
    renderStart({ ...createMemoryStore(), load: () => new Promise(() => {}) });
    expect(screen.getByRole("heading", { level: 1, name: "Start" })).toBeInTheDocument();
    expect(await screen.findByText("Wczytywanie")).toHaveAttribute("role", "status");
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    // Only <main> is busy: a busy group inside it could keep the status from being read.
    expect(document.querySelectorAll("[aria-busy]")).toHaveLength(1);
  });

  it("shows the storage error with a retry when storage is unavailable", async () => {
    renderStart({
      ...createMemoryStore(),
      load: () => Promise.resolve({ kind: "unavailable" }),
    });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Nie da się wczytać danych domu" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spróbuj jeszcze raz" })).toBeInTheDocument();
  });
});
