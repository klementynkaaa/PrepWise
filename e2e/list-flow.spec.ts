import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createPlanThroughUi, seedCompleteProfile } from "./seed";

// The seeded household (2 adults, a child, a cat, a flat, medicines) has a
// priority 1 of water, food, medicines and the first-aid kit.

async function waitForControlledPage(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  const controlled = () => page.evaluate(() => navigator.serviceWorker.controller !== null);
  if (!(await controlled())) {
    await page.reload();
  }
  await expect.poll(controlled).toBe(true);
}

/** Same rules as the routes' accessibility test: serious and critical violations fail. */
async function expectAccessible(page: Page, testInfo: TestInfo, state: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  for (const v of violations.filter((x) => !["serious", "critical"].includes(x.impact ?? ""))) {
    testInfo.annotations.push({
      type: `a11y-${v.impact ?? "unknown"}`,
      description: `${state} ${v.id}: ${v.helpUrl}`,
    });
  }
  const failing = violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
  const message = failing
    .map((v) => `${v.id} [${v.impact}] ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)
    .join("\n");
  expect(failing, `${state}\n${message}`).toEqual([]);
}

const box = (page: Page, name: string) =>
  page.getByRole("checkbox", { name, exact: true, includeHidden: true });

async function tick(page: Page, name: string, checked = true) {
  // The box follows the stored ticks only (no optimistic state), so it
  // changes once the write lands: click, then wait for it.
  await box(page, name).click();
  await expect(box(page, name)).toBeChecked({ checked });
}

test("the list is created, ticked, folds a finished priority and keeps ticks offline", async ({
  page,
  context,
}, testInfo) => {
  await seedCompleteProfile(page);
  await createPlanThroughUi(page);
  await waitForControlledPage(page);

  await page.goto("/pl/list");
  await expect(
    page.getByRole("heading", { level: 2, name: "Lista jeszcze nie powstała" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stwórz listę zakupów" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Lista zakupów" })).toBeVisible();
  const count = page.locator("main p:not(.sr-only)").filter({ hasText: /^Gotowe \d+ z \d+$/ });
  await expect(count).toHaveText(/^Gotowe 0 z \d+$/);
  const total = Number((await count.innerText()).split(" z ")[1]);
  await expect(box(page, "Woda")).toHaveAccessibleDescription(/^Najpierw/);

  // Three ticks: counts follow and "Najpierw" moves to the medicines.
  await tick(page, "Woda");
  // Water moved to the bottom of its group and its checkbox kept focus.
  await expect(box(page, "Woda")).toBeFocused();
  await tick(page, "Jedzenie");
  await tick(page, "Apteczka");
  await expect(count).toHaveText(`Gotowe 3 z ${total}`);
  await expect(page.getByText("3 z 4", { exact: true })).toBeVisible();
  await expect(box(page, "Leki na stałe")).toHaveAccessibleDescription(/^Najpierw/);
  await expect(page.getByRole("status").filter({ hasText: `Gotowe 3 z ${total}` })).toHaveCount(1);
  await expectAccessible(page, testInfo, "partial");

  // The last item of priority 1 folds the group and lands on its header.
  await tick(page, "Leki na stałe");
  const header = page.getByRole("button", { name: /^Priorytet 1:\s*Najważniejsze/ });
  await expect(header).toHaveAttribute("aria-expanded", "false");
  await expect(header).toBeFocused();
  await expect(box(page, "Woda")).toBeHidden();
  await expect(box(page, "Latarki")).toHaveAccessibleDescription(/^Najpierw/);
  await expectAccessible(page, testInfo, "folded");

  // Offline reload: the ticks are still there.
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await expect(count).toHaveText(`Gotowe 4 z ${total}`);
  await expect(header).toHaveAttribute("aria-expanded", "false");

  // Unticking (offline too) restores the item and opens the group again.
  await header.click();
  await tick(page, "Woda", false);
  await expect(count).toHaveText(`Gotowe 3 z ${total}`);
  await expect(page.getByRole("button", { name: /^Priorytet 1:/ })).toHaveCount(0);
  await expect(box(page, "Woda")).toHaveAccessibleDescription(/^Najpierw/);
});
