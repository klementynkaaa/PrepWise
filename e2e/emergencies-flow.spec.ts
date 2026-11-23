import { expect, test, type Page } from "@playwright/test";
import { createPlanThroughUi, seedCompleteProfile } from "./seed";

async function waitForControlledPage(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  const controlled = () => page.evaluate(() => navigator.serviceWorker.controller !== null);
  if (!(await controlled())) {
    await page.reload();
  }
  await expect.poll(controlled).toBe(true);
}

const sheet = (page: Page) => page.getByRole("dialog", { name: "Sytuacje" });

/** Opens the sheet from the panel, picks the emergencies and saves them with "Gotowe". */
async function choose(page: Page, names: string[]) {
  await page.getByRole("button", { name: /^(Dodaj sytuację|Zmień sytuacje w planie)$/ }).click();
  for (const name of names) await sheet(page).getByRole("checkbox", { name }).check();
  await sheet(page).getByRole("button", { name: "Gotowe" }).click();
  await expect(sheet(page)).toBeHidden();
}

test("an emergency is added and removed through the sheet on Plan", async ({ page }) => {
  await seedCompleteProfile(page);
  await createPlanThroughUi(page);
  await expect(
    page.getByRole("heading", { level: 2, name: "Sytuacje", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Dodaj sytuację" }).click();
  await sheet(page).getByRole("checkbox", { name: "Brak prądu" }).check();
  await expect(sheet(page).getByText("Dojdzie 3 rzeczy do planu.")).toBeVisible();
  await sheet(page).getByRole("button", { name: "Gotowe" }).click();
  await expect(sheet(page)).toBeHidden();

  await expect(page.getByRole("heading", { level: 2, name: "Sytuacje w planie" })).toBeVisible();
  await expect(page.getByText("Dodano 3 rzeczy do planu.").first()).toBeVisible();
  await expect(page.locator("#tier-2").getByText("Świeczki i zapalniczka")).toBeVisible();

  // Discarding with X changes nothing.
  await page.getByRole("button", { name: "Zmień sytuacje w planie" }).click();
  await sheet(page).getByRole("checkbox", { name: "Powódź" }).check();
  await sheet(page).getByRole("button", { name: "Zamknij" }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(page.locator("#section-backpack")).toHaveCount(0);

  // Removing is a plain untick: no note, the items leave the plan.
  await page.getByRole("button", { name: "Zmień sytuacje w planie" }).click();
  await sheet(page).getByRole("checkbox", { name: "Brak prądu" }).uncheck();
  await sheet(page).getByRole("button", { name: "Gotowe" }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(
    page.getByRole("heading", { level: 2, name: "Sytuacje", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#tier-2").getByText("Świeczki i zapalniczka")).toHaveCount(0);
  await expect(page.getByText(/^Dodano /)).toHaveCount(0);
});

test("the backpack shows as its own group with two bars on Plan, List and Start", async ({
  page,
}) => {
  await seedCompleteProfile(page);
  await createPlanThroughUi(page);
  await choose(page, ["Powódź", "Ewakuacja"]);

  await expect(page.getByRole("heading", { level: 2, name: "Plecak ewakuacyjny" })).toBeVisible();
  await page.getByRole("button", { name: "Stwórz listę zakupów" }).click();
  await expect(page).toHaveURL(/\/pl\/list$/);

  await expect(page.getByText("Zapasy w domu")).toBeVisible();
  await expect(
    page.locator("main p:not(.sr-only)").filter({ hasText: /^Gotowe 0 z \d+$/ }),
  ).toHaveCount(2);
  await expect(page.getByRole("heading", { level: 2, name: "Plecak ewakuacyjny" })).toBeVisible();
  await expect(page.locator("#list-backpack")).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Główna nawigacja" });
  await nav.getByRole("link", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/pl\/home$/);
  await expect(page.getByRole("link", { name: /^Zapasy w domu 0 z \d+$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Plecak ewakuacyjny 0 z \d+$/ })).toBeVisible();
});

test("the overview's Zmień opens the sheet on Plan and the hash is gone afterwards", async ({
  page,
}) => {
  await seedCompleteProfile(page);
  await createPlanThroughUi(page);
  await page.goto("/pl/household");
  await expect(page.getByText("Żadna — plan na 72 godziny")).toBeVisible();

  await page.getByRole("link", { name: "Zmień: Sytuacje" }).click();
  await expect(page).toHaveURL(/\/pl\/plan$/);
  await expect(sheet(page)).toBeVisible();
  await sheet(page).getByRole("checkbox", { name: "Ewakuacja" }).check();
  await sheet(page).getByRole("button", { name: "Gotowe" }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(page.getByRole("button", { name: "Zmień sytuacje w planie" })).toBeFocused();

  // A reload does not open it again, and the overview names the choice.
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Sytuacje w planie" })).toBeVisible();
  await expect(sheet(page)).toBeHidden();
  await page.goto("/pl/household");
  await expect(page.getByText("Ewakuacja", { exact: true })).toBeVisible();
});

test("the sheet works offline, and the choice stays after a reload", async ({ page, context }) => {
  await seedCompleteProfile(page);
  await createPlanThroughUi(page);
  await expect(page.getByRole("heading", { level: 2, name: "Plan na 72 godziny" })).toBeVisible();
  await waitForControlledPage(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await choose(page, ["Brak prądu"]);
  await expect(page.getByRole("heading", { level: 2, name: "Sytuacje w planie" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Sytuacje w planie" })).toBeVisible();
  await expect(page.locator("#tier-2").getByText("Świeczki i zapalniczka")).toBeVisible();
});
