import { expect, test, type Page } from "@playwright/test";
import { readV1Record, seedCompleteProfile } from "./seed";

async function waitForControlledPage(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  const controlled = () => page.evaluate(() => navigator.serviceWorker.controller !== null);
  if (!(await controlled())) {
    await page.reload();
  }
  await expect.poll(controlled).toBe(true);
}

const next = (page: Page) => page.getByRole("button", { name: "Dalej" });
const add = (page: Page, name: string, times = 1) =>
  page.getByRole("button", { name }).click({ clickCount: times });

/** From Welcome to the first step. */
async function openFirstStep(page: Page) {
  await page.goto("/pl");
  await page.getByRole("link", { name: "Zaczynamy" }).click();
  await page.getByRole("link", { name: "Stwórz plan" }).click();
  await expect(page).toHaveURL(/\/pl\/start\/people$/);
}

test("full path with pets counts four steps and ends on the overview", async ({ page }) => {
  await openFirstStep(page);
  await expect(page.getByText("Krok 1 z 3")).toBeVisible();
  await page.getByRole("radio", { name: "Tak" }).click();
  await expect(page.getByText("Krok 1 z 4")).toBeVisible();
  await add(page, "Więcej dorosłych", 2);
  await add(page, "Więcej dzieci");
  await expect(page.getByText("Razem: 3 osoby")).toBeVisible();
  await next(page).click();

  await expect(page).toHaveURL(/\/pl\/start\/pets$/);
  await expect(page.getByText("Krok 2 z 4")).toBeVisible();
  await add(page, "Więcej kotów");
  await next(page).click();

  await expect(page).toHaveURL(/\/pl\/start\/housing$/);
  await expect(page.getByText("Krok 3 z 4")).toBeVisible();
  await page.getByRole("radio", { name: /Mieszkanie w bloku/ }).check();
  await next(page).click();

  await expect(page).toHaveURL(/\/pl\/start\/needs$/);
  await expect(page.getByText("Krok 4 z 4")).toBeVisible();
  await page.getByRole("checkbox", { name: /Leki przyjmowane na stałe/ }).check();
  await next(page).click();

  await expect(page).toHaveURL(/\/pl\/household$/);
  await expect(page.getByText("2 dorosłych, 1 dziecko · razem 3 osoby")).toBeVisible();
  await expect(page.getByText("1 kot")).toBeVisible();
  await expect(page.getByText("Mieszkanie w bloku")).toBeVisible();
  await expect(page.getByText("Leki przyjmowane na stałe")).toBeVisible();
});

test("path without pets skips the pets step and counts three steps", async ({ page }) => {
  await openFirstStep(page);
  await add(page, "Więcej dorosłych");
  await next(page).click();

  await expect(page).toHaveURL(/\/pl\/start\/housing$/);
  await expect(page.getByText("Krok 2 z 3")).toBeVisible();
  await page.getByRole("radio", { name: /Dom jednorodzinny/ }).check();
  await next(page).click();

  await expect(page).toHaveURL(/\/pl\/start\/needs$/);
  await expect(page.getByText("Krok 3 z 3")).toBeVisible();
  await next(page).click();

  await expect(page).toHaveURL(/\/pl\/household$/);
  await expect(page.getByText("Dom jednorodzinny")).toBeVisible();
  await expect(page.getByText("Brak")).toHaveCount(2);
});

test("Dalej is disabled with its reason on people and housing", async ({ page }) => {
  await openFirstStep(page);
  const button = next(page);
  await expect(button).toHaveAttribute("aria-disabled", "true");
  await expect(
    page.getByText("Do przejścia dalej potrzebna jest co najmniej jedna osoba."),
  ).toBeVisible();
  await button.click({ force: true });
  await expect(page).toHaveURL(/\/pl\/start\/people$/);

  await add(page, "Więcej dorosłych");
  await next(page).click();
  await expect(page).toHaveURL(/\/pl\/start\/housing$/);
  await expect(next(page)).toHaveAttribute("aria-disabled", "true");
  await expect(
    page.getByText("Do przejścia dalej potrzebny jest wybór rodzaju domu."),
  ).toBeVisible();
});

test("reload after step 2 resumes with the answers filled", async ({ page }) => {
  await openFirstStep(page);
  await page.getByRole("radio", { name: "Tak" }).click();
  await add(page, "Więcej dorosłych", 2);
  await next(page).click();
  await add(page, "Więcej kotów", 2);
  await next(page).click();
  await expect(page).toHaveURL(/\/pl\/start\/housing$/);

  await page.goto("/pl/start");
  // The link points at the first unfinished step once the household is read.
  const resume = page.getByRole("link", { name: "Stwórz plan" });
  await expect(resume).toHaveAttribute("href", /\/pl\/start\/housing$/);
  await resume.click();
  await expect(page).toHaveURL(/\/pl\/start\/housing$/);

  await page.goto("/pl/start/people");
  await expect(page.getByRole("group", { name: "Dorośli" })).toContainText("2");
  await expect(page.getByRole("radio", { name: "Tak" })).toBeChecked();
  await page.goto("/pl/start/pets");
  await expect(page.getByRole("group", { name: "Kot" })).toContainText("2");
});

test("a direct visit to a later step opens the first unfinished one", async ({ page }) => {
  await page.goto("/pl/start/needs");
  await expect(page).toHaveURL(/\/pl\/start\/people$/);
  await expect(page.getByRole("heading", { level: 1, name: "Kto mieszka w domu?" })).toBeVisible();
});

test("Zmień opens the step and Dalej returns to the overview", async ({ page }) => {
  await seedCompleteProfile(page);
  await page.goto("/pl/household");
  await page.getByRole("link", { name: "Zmień: Miejsce zamieszkania" }).click();
  await expect(page).toHaveURL(/\/pl\/start\/housing$/);
  await page.getByRole("radio", { name: /Dom jednorodzinny/ }).check();
  await next(page).click();
  await expect(page).toHaveURL(/\/pl\/household$/);
  await expect(page.getByText("Dom jednorodzinny")).toBeVisible();
});

test("Welcome skips itself once the profile is complete", async ({ page }) => {
  await seedCompleteProfile(page);
  await page.goto("/pl");
  await expect(page).toHaveURL(/\/pl\/household$/);
  await expect(page.getByRole("heading", { level: 1, name: "Profil domu" })).toBeVisible();
});

test("the overview opens after a reload with the network off", async ({ page, context }) => {
  await seedCompleteProfile(page);
  await page.goto("/pl/household");
  await expect(page.getByRole("heading", { level: 1, name: "Profil domu" })).toBeVisible();
  await waitForControlledPage(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Profil domu" })).toBeVisible();
  await expect(page.getByText("2 dorosłych, 1 dziecko · razem 3 osoby")).toBeVisible();
  await expect(page.getByText("Bez internetu — wszystko działa")).toBeVisible();
});

test("a seeded S-01 household is imported once and shows the same summary after a reload", async ({
  page,
}) => {
  await seedCompleteProfile(page);
  await page.goto("/pl/household");
  await expect(page.getByRole("heading", { level: 1, name: "Profil domu" })).toBeVisible();
  await expect(page.getByText("2 dorosłych, 1 dziecko · razem 3 osoby")).toBeVisible();
  await expect(page.getByText("1 kot")).toBeVisible();

  // The v1 record is gone, so the summary below comes from the new store.
  await expect.poll(() => readV1Record(page)).toBeUndefined();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Profil domu" })).toBeVisible();
  await expect(page.getByText("2 dorosłych, 1 dziecko · razem 3 osoby")).toBeVisible();
  await expect(page.getByText("1 kot")).toBeVisible();
  await expect(page.getByText("Mieszkanie w bloku")).toBeVisible();
  await expect(page.getByText("Leki przyjmowane na stałe")).toBeVisible();
});

test("blocked storage shows the save error and keeps the form", async ({ page }) => {
  // No local database can open: its workers cannot start, and IndexedDB is blocked.
  await page.addInitScript(() => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    IDBFactory.prototype.open = blocked;
    Object.defineProperty(window, "Worker", { value: blocked });
    Object.defineProperty(window, "SharedWorker", { value: blocked });
  });
  await page.goto("/pl/start/people");
  await add(page, "Więcej dorosłych");
  await next(page).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Nie udało się zapisać" }),
  ).toBeVisible();
  await expect(page.getByText("Przeglądarka blokuje zapis")).toBeVisible();
  await expect(page).toHaveURL(/\/pl\/start\/people$/);

  await page.getByRole("button", { name: "Wróć do formularza" }).click();
  await expect(page.getByText("Razem: 1 osoba")).toBeVisible();
});
