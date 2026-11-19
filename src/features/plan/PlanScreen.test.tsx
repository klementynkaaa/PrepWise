import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStore, type HouseholdStore } from "@/lib/household";
import { completeHousehold } from "@/lib/household/fixtures";
import { renderScreen } from "@/features/household/test-utils";
import { PlanScreen } from "./PlanScreen";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/pl/plan" }));

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
});

const noPets = { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 };

/** The agreed default plan: 2 adults, a small child, a medium dog; medicines and diet; a flat. */
const defaultHousehold = () =>
  completeHousehold({
    people: { adults: 2, seniors: 0, children: 0, smallChildren: 1 },
    pets: { ...noPets, mediumDog: 1 },
    needs: ["regularMedicines", "specialDiet"],
  });

/** One adult in a flat, nothing else. */
const minimalHousehold = () =>
  completeHousehold({
    people: { adults: 1, seniors: 0, children: 0, smallChildren: 0 },
    hasPets: false,
    pets: noPets,
    needs: [],
    completedSteps: ["people", "housing", "needs"],
  });

const renderPlan = (store: HouseholdStore) => renderScreen(<PlanScreen locale="pl" />, store);

describe("plan screen", () => {
  it("renders the tiers, the member sections, the water row first and a PREPWISE pill on every row", async () => {
    renderPlan(createMemoryStore(defaultHousehold()));
    await screen.findByText("Plan na 72 godziny");

    for (const name of [
      /^Priorytet 1:\s*Najważniejsze$/,
      /^Priorytet 2:\s*Bezpieczeństwo i codzienność$/,
      /^Priorytet 3:\s*Dodatkowo$/,
      /^Dla małego dziecka$/,
      /^Dla psa$/,
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
    expect(document.getElementById("tier-1")).not.toBeNull();
    expect(document.getElementById("section-smallChild")).not.toBeNull();
    expect(document.getElementById("section-pets")).not.toBeNull();

    // Water is the "Najpierw" row, with its formula and quantity.
    const tier1 = within(document.getElementById("tier-1")!);
    expect(tier1.getByText("Najpierw")).toBeInTheDocument();
    expect(tier1.getByText("Woda pitna")).toBeInTheDocument();
    expect(tier1.getByText("3 l × 3 osoby × 3 dni")).toBeInTheDocument();
    expect(tier1.getByText("27 l")).toBeInTheDocument();
    expect(tier1.getByText(/zgodne z dietą/)).toBeInTheDocument();
    expect(tier1.getByText("Wasza dawka × 3 dni — sprawdźcie zapas")).toBeInTheDocument();

    // The pointer row leads to the small-child section.
    expect(
      tier1.getByRole("link", { name: "w sekcji „Dla małego dziecka” niżej" }),
    ).toHaveAttribute("href", "#section-smallChild");
    const child = within(document.getElementById("section-smallChild")!);
    expect(child.getByText(/priorytet 1$/)).toBeInTheDocument();
    expect(child.getByText(/priorytet 2$/)).toBeInTheDocument();
    expect(within(document.getElementById("section-pets")!).getByText("4,5 l")).toBeInTheDocument();

    // Every row shows a source, and every draft row is a PREPWISE recommendation.
    const main = within(screen.getByRole("main"));
    const rows = main.getAllByRole("listitem");
    expect(rows.length).toBeGreaterThan(20);
    for (const row of rows) {
      expect(within(row).getByText("źródło: rekomendacja PREPWISE")).toBeInTheDocument();
    }
    expect(main.queryByText("źródło: zalecenie oficjalne")).not.toBeInTheDocument();
  });

  it("reads Plan na 72 godziny for the household, and counts items, tiers and sections", async () => {
    renderPlan(createMemoryStore(defaultHousehold()));
    expect(
      await screen.findByRole("heading", { level: 2, name: "Plan na 72 godziny" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dla 2 dorosłych, 1 małego dziecka i 1 psa.")).toBeInTheDocument();
    expect(screen.getByText(/^\d+ rzecz\S* · 3 priorytety i 2 sekcje$/)).toBeInTheDocument();
  });

  it("leaves the sections clause out when the plan has no sections", async () => {
    renderPlan(createMemoryStore(minimalHousehold()));
    expect(await screen.findByText("Dla 1 dorosłego.")).toBeInTheDocument();
    expect(screen.getByText(/^\d+ rzecz\S* · 3 priorytety$/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Dla małego dziecka" })).not.toBeInTheDocument();
  });

  it("opens the sources sheet and returns focus to its opener on close", async () => {
    renderPlan(createMemoryStore(defaultHousehold()));
    const opener = await screen.findByRole("button", { name: "Skąd te ilości?" });
    await userEvent.click(opener);

    const sheet = screen.getByRole("dialog", { name: "Skąd te ilości?" });
    expect(sheet).toHaveAttribute("open");
    expect(within(sheet).getByText("ilość z oficjalnego poradnika")).toBeInTheDocument();

    await userEvent.click(within(sheet).getAllByRole("button", { name: "Zamknij" })[0]);
    expect(sheet).not.toHaveAttribute("open");
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("ends with the Lista zakupów panel that creates the list and opens it", async () => {
    const store = createMemoryStore(defaultHousehold());
    const mark = vi.spyOn(store, "markListCreated");
    renderPlan(store);
    expect(
      await screen.findByRole("heading", { level: 2, name: "Lista zakupów" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Te same 22 rzeczy do odhaczania — od najważniejszych, z postępem zapisanym w telefonie.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Otwórz listę" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Stwórz listę zakupów" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/pl/list"));
    expect(mark).toHaveBeenCalledTimes(1);
    const load = await store.load();
    expect(load.kind === "found" && load.listCreatedAt).not.toBeNull();
  });

  it("shows the list's progress and Otwórz listę once the list exists", async () => {
    const store = createMemoryStore(defaultHousehold());
    await store.markListCreated();
    // Water ticked at today's amount, food at less than it needs now: one counts.
    await store.setTick("drinking-water", true, 27);
    await store.setTick("shelf-stable-food", true, 0);
    renderPlan(store);

    expect(await screen.findByText("Gotowe 1 z 22")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Postęp listy zakupów" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Otwórz listę" })).toHaveAttribute("href", "/pl/list");
    expect(screen.queryByRole("button", { name: "Stwórz listę zakupów" })).not.toBeInTheDocument();
  });

  it("stays on Plan and explains when the list can't be created", async () => {
    const store = createMemoryStore(defaultHousehold());
    renderPlan({ ...store, markListCreated: () => Promise.reject(new Error("storage")) });
    const create = await screen.findByRole("button", { name: "Stwórz listę zakupów" });
    // The live region is there, empty, before the failure, so the failure is read.
    const region = screen
      .getAllByRole("status")
      .find((element) => element.classList.contains("sr-only"))!;
    expect(region).toHaveTextContent("");

    await userEvent.click(create);

    await waitFor(() => expect(region).toHaveTextContent(/^Nie udało się stworzyć listy\./));
    expect(screen.getAllByText(/^Nie udało się stworzyć listy\./)).toHaveLength(2);
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Stwórz listę zakupów" })).toBeInTheDocument();
  });

  it("shows the Online chip and the Start · Plan · Lista tabs", async () => {
    renderPlan(createMemoryStore(defaultHousehold()));
    await screen.findByText("Plan na 72 godziny");
    expect(screen.getByText("Online")).toBeInTheDocument();
    // One banner landmark (the app header): the page title's <header> sits inside
    // <main>, where it is no landmark. jsdom's role mapping ignores that scoping.
    expect(document.querySelectorAll("header:not(main header)")).toHaveLength(1);
    const nav = screen.getByRole("navigation", { name: "Główna nawigacja" });
    expect(within(nav).getByRole("link", { name: "Start" })).toHaveAttribute("href", "/pl/home");
    expect(within(nav).getByRole("link", { name: "Plan" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Lista" })).toHaveAttribute("href", "/pl/list");
  });

  it("does not write the plan flag when it opens", async () => {
    const store = createMemoryStore(defaultHousehold());
    const mark = vi.spyOn(store, "markPlanCreated");
    renderPlan(store);
    await screen.findByText("Plan na 72 godziny");
    expect(mark).not.toHaveBeenCalled();
  });

  it("holds the plan's shape with a skeleton while storage is read", async () => {
    const store: HouseholdStore = {
      ...createMemoryStore(),
      load: () => new Promise(() => {}),
    };
    renderPlan(store);
    expect(screen.getByRole("heading", { level: 1, name: "Plan" })).toBeInTheDocument();
    expect(await screen.findByText("Wczytywanie")).toHaveAttribute("role", "status");
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    // Only <main> is busy: a busy group inside it could keep the status from being read.
    expect(document.querySelectorAll("[aria-busy]")).toHaveLength(1);
    expect(document.querySelectorAll("header:not(main header)")).toHaveLength(1);
  });

  it("shows the storage error with a retry when storage is unavailable", async () => {
    const store: HouseholdStore = {
      ...createMemoryStore(),
      load: () => Promise.resolve({ kind: "unavailable" }),
    };
    renderPlan(store);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Nie da się otworzyć planu" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spróbuj jeszcze raz" })).toBeInTheDocument();
    // The short error: a title and the button, no body line.
    expect(screen.getByRole("main").querySelector("p")).toBeNull();
  });

  it("continues at the first unfinished step when the profile is not complete", async () => {
    renderPlan(
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
});
