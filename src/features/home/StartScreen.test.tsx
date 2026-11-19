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

  it("shows the one thing to do, derived from the plan's stage", async () => {
    renderStart(await storeWithPlan(defaultHousehold()));
    expect(
      await screen.findByRole("heading", { level: 2, name: "Do zrobienia" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Plan gotowy — czas na kompletowanie")).toBeInTheDocument();
    expect(
      screen.getByText("Najpierw rzeczy z priorytetu 1: woda, jedzenie, leki i apteczka."),
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

  it("names the collecting stage and shows the list's readiness once the list exists", async () => {
    const store = await storeWithPlan(defaultHousehold());
    await store.markListCreated();
    // Water counts; food ticked at less than it needs now does not.
    await store.setTick("drinking-water", true, 27);
    await store.setTick("shelf-stable-food", true, 0);
    renderStart(store);

    expect(await screen.findByText("Teraz: kompletowanie zapasów")).toBeInTheDocument();
    expect(screen.getByText("Lista zakupów jest gotowa do odhaczania.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Otwórz listę" })).toHaveAttribute("href", "/pl/list");
    expect(screen.queryByText("Plan gotowy — czas na kompletowanie")).not.toBeInTheDocument();

    expect(
      screen.getByRole("heading", { level: 2, name: "Gotowość na 72 godziny" }),
    ).toBeInTheDocument();
    // The section's header link "Plan", besides the tab of the same name.
    const planLinks = screen.getAllByRole("link", { name: "Plan" });
    expect(planLinks.filter((link) => !link.closest("nav"))).toHaveLength(1);
    for (const link of planLinks) expect(link).toHaveAttribute("href", "/pl/plan");
    const panel = screen.getByRole("link", { name: /^Gotowe 1 z 22/ });
    expect(panel).toHaveAttribute("href", "/pl/list");
    expect(within(panel).getByText("Zostało 21 rzeczy do odhaczenia.")).toBeInTheDocument();
    // A ring with the short count, at the top: right after the banner, before "Do zrobienia".
    expect(within(panel).getByText("1/22")).toBeInTheDocument();
    const readiness = screen.getByRole("heading", { level: 2, name: "Gotowość na 72 godziny" });
    const todo = screen.getByRole("heading", { level: 2, name: "Do zrobienia" });
    expect(readiness.compareDocumentPosition(todo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The tiles give way to the one panel.
    expect(screen.queryByRole("heading", { name: "Plan na 72 godziny" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Priorytet \d:/ })).not.toBeInTheDocument();
  });

  it("marks the stage as done once every supply on the list is ticked", async () => {
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
    expect(screen.queryByText("Teraz: kompletowanie zapasów")).not.toBeInTheDocument();
    const panel = screen.getByRole("link", { name: /^Gotowe 22 z 22/ });
    // The full ring shows a check mark instead of "22/22".
    expect(within(panel).queryByText("22/22")).not.toBeInTheDocument();
    expect(within(panel).getByText("Wszystko odhaczone.")).toBeInTheDocument();
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
