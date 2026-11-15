import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeHousehold } from "@/lib/household/fixtures";
import { createMemoryStore } from "@/lib/household";
import { Overview } from "./Overview";
import { renderScreen } from "./test-utils";

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
    ]);
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
    expect(await screen.findByText("Zapisane na tym telefonie")).toBeInTheDocument();
  });
});
