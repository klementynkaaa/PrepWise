import { expect, test, type Page } from "@playwright/test";

const heading = "Spokój zaczyna się od przygotowania.";

async function waitForControlledPage(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  const controlled = () => page.evaluate(() => navigator.serviceWorker.controller !== null);
  if (!(await controlled())) {
    await page.reload();
  }
  await expect.poll(controlled).toBe(true);
}

test("Welcome shows one logo and Zaczynamy opens /start", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.getByRole("img", { name: "PREPWISE" })).toHaveCount(1);

  await page.getByRole("link", { name: "Zaczynamy" }).click();
  await expect(page).toHaveURL(/\/start$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Tu powstanie plan dla domu" }),
  ).toBeVisible();
});

test("Welcome and Zaczynamy work offline after the first visit", async ({ page, context }) => {
  await page.goto("/");
  await waitForControlledPage(page);

  await context.setOffline(true);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await page.getByRole("link", { name: "Zaczynamy" }).click();
  await expect(page).toHaveURL(/\/start$/);
  await expect(page.locator("main")).toBeVisible();
});
