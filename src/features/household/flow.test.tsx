import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeHousehold } from "@/lib/household/fixtures";
import { createMemoryStore, HouseholdStoreError, type HouseholdStore } from "@/lib/household";
import { HousingStep } from "./HousingStep";
import { NeedsStep } from "./NeedsStep";
import { PeopleStep } from "./PeopleStep";
import { PetsStep } from "./PetsStep";
import { StartIntro } from "./StartIntro";
import { WelcomeGate } from "./WelcomeGate";
import { renderScreen } from "./test-utils";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
});

const addAdult = async () => {
  await userEvent.click(await screen.findByRole("button", { name: "Więcej dorosłych" }));
};

describe("people step", () => {
  it("disables Dalej with its reason until one person is added, then saves and moves on", async () => {
    const store = createMemoryStore();
    renderScreen(<PeopleStep locale="pl" />, store);

    expect(await screen.findByText("Krok 1 z 3")).toBeInTheDocument();
    const next = screen.getByRole("button", { name: "Dalej" });
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(next).toHaveAccessibleDescription(
      "Do przejścia dalej potrzebna jest co najmniej jedna osoba.",
    );

    await addAdult();
    expect(screen.getByText("Razem: 1 osoba")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/pl/start/housing"));
    const loaded = await store.load();
    expect(loaded.kind === "found" && loaded.household.people.adults).toBe(1);
  });

  it("counts four steps when pets are chosen and goes to the pets step", async () => {
    renderScreen(<PeopleStep locale="pl" />);
    await addAdult();
    await userEvent.click(screen.getByRole("radio", { name: "Tak" }));
    expect(screen.getByText("Krok 1 z 4")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/pl/start/pets"));
  });

  it("keeps the form and shows the save error when saving fails, then retries", async () => {
    const failing: HouseholdStore = {
      ...createMemoryStore(),
      saveStep: vi
        .fn()
        .mockRejectedValueOnce(new HouseholdStoreError("unavailable"))
        .mockResolvedValue(completeHousehold()),
    };
    renderScreen(<PeopleStep locale="pl" />, failing);
    await addAdult();
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));

    expect(
      await screen.findByRole("heading", { name: "Nie udało się zapisać" }),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Wróć do formularza" }));
    expect(await screen.findByText("Razem: 1 osoba")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));
    await waitFor(() => expect(router.push).toHaveBeenCalled());
  });

  it("returns to the overview when editing a finished profile", async () => {
    renderScreen(<PeopleStep locale="pl" />, createMemoryStore(completeHousehold()));
    await userEvent.click(await screen.findByRole("button", { name: "Więcej dorosłych" }));
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/pl/household"));
  });

  it("opens the pets step first when pets change from no to yes while editing", async () => {
    const noPets = completeHousehold({
      hasPets: false,
      pets: { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 },
      completedSteps: ["people", "housing", "needs"],
    });
    renderScreen(<PeopleStep locale="pl" />, createMemoryStore(noPets));
    await userEvent.click(await screen.findByRole("radio", { name: "Tak" }));
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/pl/start/pets"));
  });
});

describe("guards", () => {
  it("replaces housing with the first unfinished step on a direct visit", async () => {
    renderScreen(<HousingStep locale="pl" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/pl/start/people"));
  });

  it("replaces the pets step with housing when there are no pets", async () => {
    const noPets = completeHousehold({
      hasPets: false,
      pets: { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 },
      completedSteps: ["people"],
      housingType: null,
      status: "draft",
      needs: [],
    });
    renderScreen(<PetsStep locale="pl" />, createMemoryStore(noPets));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/pl/start/housing"));
  });
});

describe("housing and needs steps", () => {
  it("needs a choice before Dalej, then saves it", async () => {
    const store = createMemoryStore(
      completeHousehold({ housingType: null, status: "draft", completedSteps: ["people", "pets"] }),
    );
    renderScreen(<HousingStep locale="pl" />, store);

    expect(await screen.findByText("Krok 3 z 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dalej" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("group", { name: "Rodzaj domu" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: /Dom jednorodzinny/ }));
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/pl/start/needs"));
  });

  it("shows a note for ticked medicines and opens the overview after Dalej", async () => {
    const store = createMemoryStore(
      completeHousehold({
        needs: [],
        status: "draft",
        completedSteps: ["people", "pets", "housing"],
      }),
    );
    renderScreen(<NeedsStep locale="pl" />, store);

    await userEvent.click(
      await screen.findByRole("checkbox", { name: /Leki przyjmowane na stałe/ }),
    );
    expect(screen.getByText(/Plan doda przypomnienie o zapasie leków/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/pl/household"));
  });
});

describe("start intro and welcome gate", () => {
  it("opens the first unfinished step", async () => {
    const store = createMemoryStore(
      completeHousehold({ housingType: null, status: "draft", completedSteps: ["people", "pets"] }),
    );
    renderScreen(<StartIntro locale="pl" />, store);
    const link = screen.getByRole("link", { name: "Stwórz plan" });
    await waitFor(() => expect(link).toHaveAttribute("href", "/pl/start/housing"));
  });

  it("skips Welcome for a complete profile", async () => {
    renderScreen(
      <WelcomeGate locale="pl">
        <p>Welcome</p>
      </WelcomeGate>,
      createMemoryStore(completeHousehold()),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/pl/household"));
    expect(screen.queryByText("Welcome")).not.toBeInTheDocument();
  });

  it("shows Welcome when nothing is saved", async () => {
    renderScreen(
      <WelcomeGate locale="pl">
        <p>Welcome</p>
      </WelcomeGate>,
    );
    expect(await screen.findByText("Welcome")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows Welcome when a draft is saved", async () => {
    renderScreen(
      <WelcomeGate locale="pl">
        <p>Welcome</p>
      </WelcomeGate>,
      createMemoryStore(
        completeHousehold({ status: "draft", housingType: null, completedSteps: ["people"] }),
      ),
    );
    expect(await screen.findByText("Welcome")).toBeInTheDocument();
  });

  it("shows Welcome when storage is unavailable", async () => {
    const unavailable: HouseholdStore = {
      ...createMemoryStore(),
      load: async () => ({ kind: "unavailable" }),
    };
    renderScreen(
      <WelcomeGate locale="pl">
        <p>Welcome</p>
      </WelcomeGate>,
      unavailable,
    );
    expect(await screen.findByText("Welcome")).toBeInTheDocument();
  });
});
