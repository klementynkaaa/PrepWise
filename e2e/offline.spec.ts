import { expect, test, type Page } from "@playwright/test";
import { routes } from "./routes";
import { seedCompleteProfile } from "./seed";

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
  await page.goto("/pl");
  await waitForControlledPage(page);

  await context.setOffline(true);
  let seeded = false;
  for (const route of routes) {
    if (route.profile && !seeded) {
      await seedCompleteProfile(page);
      seeded = true;
    }
    await page.goto(route.path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("main[aria-busy]")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");
  }
});

test("reloading / offline still ends at /pl", async ({ page, context }) => {
  await page.goto("/pl");
  await waitForControlledPage(page);

  await context.setOffline(true);
  await page.goto("/");
  await expect(page).toHaveURL(/\/pl$/);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pl");
});

test("an uncached URL shows the Polish offline page", async ({ page, context }) => {
  await page.goto("/pl");
  await waitForControlledPage(page);

  await context.setOffline(true);
  await page.goto("/nie-ma-takiej-strony");
  await expect(
    page.getByRole("heading", { level: 1, name: "Brak połączenia z internetem" }),
  ).toBeVisible();
});

test("@smoke every route returns 200 in Polish and the service worker takes control", async ({
  page,
}) => {
  for (const route of routes) {
    const response = await page.goto(route.path);
    expect(response?.status(), route.path).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");
    await expect(page.locator("main")).toBeVisible();
  }

  await page.goto("/pl");
  await waitForControlledPage(page);
});
