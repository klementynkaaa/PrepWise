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

/** The plan's rows as text, in order: what a reload must show again. */
const planRows = (page: Page) => page.getByRole("main").getByRole("listitem").allInnerTexts();

test("the overview's Stwórz plan runs the generating screen and opens the plan", async ({
  page,
}) => {
  await seedCompleteProfile(page);
  await page.goto("/pl/household");
  await page.getByRole("button", { name: "Stwórz plan" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Liczenie planu" })).toBeVisible();
  await expect(page).toHaveURL(/\/pl\/plan$/);
  await expect(page.getByRole("heading", { level: 1, name: "Plan" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Plan na 72 godziny" })).toBeVisible();

  // Every row is a draft: each one carries the PREPWISE pill, none is official.
  const rows = page.getByRole("main").getByRole("listitem");
  const count = await rows.count();
  expect(count).toBeGreaterThan(10);
  const main = page.getByRole("main");
  await expect(main.getByText("źródło: rekomendacja PREPWISE")).toHaveCount(count);
  await expect(main.getByText("źródło: zalecenie oficjalne")).toHaveCount(0);

  // Back on the overview, the plan exists: the button now opens it.
  await page.goto("/pl/household");
  await expect(page.getByRole("link", { name: "Pokaż plan" })).toBeVisible();
});

test("/pl lands on Start once a plan exists, and its tiles lead into the plan", async ({
  page,
}) => {
  await seedCompleteProfile(page);
  await createPlanThroughUi(page);

  await page.goto("/pl");
  await expect(page).toHaveURL(/\/pl\/home$/);
  await expect(page.getByRole("heading", { level: 2, name: "Wasz dom" })).toBeVisible();
  await expect(page.getByText("Plan gotowy — czas na kompletowanie")).toBeVisible();

  await page.getByRole("link", { name: /^Priorytet 2:/ }).click();
  await expect(page).toHaveURL(/\/pl\/plan#tier-2$/);
  await expect(page.locator("#tier-2")).toBeInViewport();

  // "Zmień" opens the overview, which stays put instead of bouncing back to Start.
  await page.goto("/pl/home");
  await page.getByRole("link", { name: "Zmień profil domu" }).click();
  await expect(page).toHaveURL(/\/pl\/household$/);
  await expect(page.getByRole("heading", { level: 1, name: "Profil domu" })).toBeVisible();
});

test("an offline reload of the plan shows the same rows", async ({ page, context }) => {
  await seedCompleteProfile(page);
  await createPlanThroughUi(page);
  await expect(page.getByRole("heading", { level: 2, name: "Plan na 72 godziny" })).toBeVisible();
  await waitForControlledPage(page);
  const online = await planRows(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Plan na 72 godziny" })).toBeVisible();
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  expect(await planRows(page)).toEqual(online);

  await page.goto("/pl");
  await expect(page).toHaveURL(/\/pl\/home$/);
  await expect(page.getByRole("heading", { level: 2, name: "Wasz dom" })).toBeVisible();
});
