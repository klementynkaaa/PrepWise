import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStore, summarise, type HouseholdStore } from "@/lib/household";
import { completeHousehold } from "@/lib/household/fixtures";
import { renderScreen } from "@/features/household/test-utils";
import { buildList } from "@/lib/list";
import { buildPlan } from "@/lib/plan";
import { ListScreen } from "./ListScreen";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/pl/list" }));

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
});

const noPets = { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 };

/** The agreed default plan (22 items): 2 adults, a small child, a medium dog; medicines and diet; a flat. */
const defaultHousehold = () =>
  completeHousehold({
    people: { adults: 2, seniors: 0, children: 0, smallChildren: 1 },
    pets: { ...noPets, mediumDog: 1 },
    needs: ["regularMedicines", "specialDiet"],
  });

const TIER_1 = ["Woda", "Jedzenie", "Pokarm dla dziecka", "Leki na stałe", "Apteczka"];

async function storeWithList(): Promise<HouseholdStore> {
  const store = createMemoryStore(defaultHousehold());
  await store.markListCreated();
  return store;
}

const renderList = (store: HouseholdStore) => renderScreen(<ListScreen locale="pl" />, store);

const box = (name: string) => screen.getByRole("checkbox", { name });
/** The checkbox names of one group, in the order shown. */
const groupOrder = (key: string) =>
  within(document.getElementById(`list-${key}`)!)
    .getAllByRole("checkbox", { hidden: true })
    .map((element) => element.getAttribute("aria-labelledby"))
    .map((id) => document.getElementById(id!)!.textContent);
const liveRegion = () =>
  screen.getAllByRole("status").find((element) => element.className.includes("sr-only"))!;

describe("list screen", () => {
  it("offers to create the list before it exists, then shows it", async () => {
    renderList(createMemoryStore(defaultHousehold()));
    expect(
      await screen.findByRole("heading", { level: 2, name: "Lista jeszcze nie powstała" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Powstanie na podstawie planu na 72 godziny.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Stwórz listę zakupów" }));

    expect(await screen.findByText("Gotowe 0 z 22")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Lista zakupów" })).toBeInTheDocument();
    expect(
      screen.getByText("Na 72 godziny · dla 2 dorosłych, 1 małego dziecka i 1 psa"),
    ).toBeInTheDocument();
    expect(screen.getByText("Zostały 22 rzeczy do odhaczenia.")).toBeInTheDocument();
    expect(box("Woda")).toHaveAccessibleDescription(/^Najpierw/);
    expect(box("Woda")).toHaveAccessibleDescription(/27 l$/);
    await waitFor(() => expect(box("Woda")).toHaveFocus());
  });

  it("shows the rows with the plan's detail line, without the priority on a child item", async () => {
    renderList(await storeWithList());
    await screen.findByText("Gotowe 0 z 22");
    expect(groupOrder("tier-1")).toEqual(TIER_1);
    expect(box("Woda")).toHaveAccessibleDescription("Najpierw 3 l × 3 osoby × 3 dni 27 l");
    expect(box("Pokarm dla dziecka")).not.toHaveAccessibleDescription(/priorytet/);
    expect(box("Woda dla psa")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /^Priorytet 1:\s*Najważniejsze$/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Dla psa" })).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("moves a ticked row to the bottom of its group, keeps its focus and moves Najpierw", async () => {
    const { store } = renderList(await storeWithList());
    await screen.findByText("Gotowe 0 z 22");
    expect(liveRegion()).toHaveTextContent("");

    const water = box("Woda");
    await userEvent.click(water);

    await waitFor(() => expect(box("Woda")).toBeChecked());
    expect(groupOrder("tier-1")).toEqual([...TIER_1.slice(1), "Woda"]);
    expect(box("Woda")).toHaveFocus();
    expect(box("Jedzenie")).toHaveAccessibleDescription(/^Najpierw/);
    expect(box("Woda")).not.toHaveAccessibleDescription(/Najpierw/);
    expect(screen.getByText("Gotowe 1 z 22", { selector: "p:not(.sr-only)" })).toBeInTheDocument();
    expect(screen.getByText("1 z 5")).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent("Gotowe 1 z 22");

    const load = await store.load();
    expect(load.kind === "found" && load.ticks).toEqual([
      { item: "drinking-water", selected: true, quantity: 27 },
    ]);

    // Unticking is the undo: the row goes back to the top.
    await userEvent.click(box("Woda"));
    await waitFor(() => expect(box("Woda")).not.toBeChecked());
    expect(groupOrder("tier-1")).toEqual(TIER_1);
    expect(box("Woda")).toHaveFocus();
    expect(liveRegion()).toHaveTextContent("Gotowe 0 z 22");
  });

  it("folds a finished group, focuses its header, and keeps it open once opened", async () => {
    renderList(await storeWithList());
    await screen.findByText("Gotowe 0 z 22");
    for (const name of TIER_1.slice(0, 4)) {
      await userEvent.click(box(name));
      await waitFor(() => expect(box(name)).toBeChecked());
    }
    await userEvent.click(box("Apteczka"));

    const header = await screen.findByRole("button", { name: /^Priorytet 1:\s*Najważniejsze/ });
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(header).toHaveAccessibleName(/5 z 5$/);
    await waitFor(() => expect(header).toHaveFocus());
    expect(document.getElementById("list-tier-1")).not.toBeVisible();
    expect(box("Latarki")).toHaveAccessibleDescription(/^Najpierw/);

    // Opened by hand, it stays open through an untick and a tick.
    await userEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(box("Woda"));
    await waitFor(() => expect(box("Woda")).not.toBeChecked());
    expect(screen.queryByRole("button", { name: /^Priorytet 1:/ })).not.toBeInTheDocument();
    await userEvent.click(box("Woda"));
    await waitFor(() => expect(box("Woda")).toBeChecked());
    expect(screen.getByRole("button", { name: /^Priorytet 1:/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(box("Woda")).toHaveFocus();
  });

  it("shows the all-done state above the folded groups", async () => {
    const store = await storeWithList();
    renderList(store);
    await screen.findByText("Gotowe 0 z 22");
    expect(screen.getAllByRole("checkbox")).toHaveLength(22);
    // Tick through the store, as another device would; the screen follows.
    const plan = buildPlan(summarise(defaultHousehold()), 3);
    for (const row of buildList(plan, []).groups.flatMap((g) => g.rows)) {
      await act(() => store.setTick(row.itemId, true, row.quantity));
    }

    expect(
      await screen.findByRole("heading", { level: 2, name: "Wszystko na 72 godziny gotowe" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^22 z 22 rzeczy odhaczone\./)).toBeInTheDocument();
    expect(screen.getByText("Wszystko odhaczone.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { expanded: false })).toHaveLength(4);
  });

  it("leaves the row as stored and explains when a tick can't be saved", async () => {
    const store = await storeWithList();
    const failing: HouseholdStore = {
      ...store,
      setTick: () => Promise.reject(new Error("storage")),
    };
    renderList(failing);
    await screen.findByText("Gotowe 0 z 22");

    await userEvent.click(box("Woda"));

    expect(await screen.findByText(/^Nie udało się zapisać odhaczenia\./)).toBeInTheDocument();
    expect(box("Woda")).not.toBeChecked();
    expect(groupOrder("tier-1")).toEqual(TIER_1);
    expect(screen.getByText("Gotowe 0 z 22")).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent("");
  });

  it("shows the storage error with only a title and a retry", async () => {
    const store = createMemoryStore(defaultHousehold());
    renderList({ ...store, load: () => Promise.resolve({ kind: "unavailable" }) });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Nie udało się otworzyć listy" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spróbuj ponownie" })).toBeInTheDocument();
    expect(screen.getByRole("main").querySelector("p")).toBeNull();
  });

  it("shows the loading placeholders while storage is read", () => {
    const store = createMemoryStore(defaultHousehold());
    renderList({ ...store, load: () => new Promise(() => {}) });
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { level: 1, name: "Lista zakupów" })).toBeInTheDocument();
  });
});
