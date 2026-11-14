import { expect, test, type Page } from "@playwright/test";
import { routes } from "./routes";

async function waitForControlledPage(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  const controlled = () => page.evaluate(() => navigator.serviceWorker.controller !== null);
  if (!(await controlled())) {
    // clientsClaim timing varies; a reload hands the page to the active worker.
    await page.reload();
  }
  await expect.poll(controlled).toBe(true);
}

test("service worker controls the page and routes render offline", async ({ page, context }) => {
  await page.goto("/");
  await waitForControlledPage(page);

  await context.setOffline(true);
  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");
  }
});

test("an uncached URL shows the Polish offline page", async ({ page, context }) => {
  await page.goto("/");
  await waitForControlledPage(page);

  await context.setOffline(true);
  await page.goto("/nie-ma-takiej-strony");
  await expect(
    page.getByRole("heading", { level: 1, name: "Brak połączenia z internetem" }),
  ).toBeVisible();
});
