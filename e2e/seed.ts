import { expect, type Page } from "@playwright/test";

/**
 * Saves a complete household (two adults, a cat, a flat) as an S-01 record:
 * IndexedDB `prepwise` / `household` / `current`, schema version 1. The app
 * imports it into its local database on the next page that reads the
 * household, so every run that seeds also exercises the one-time v1 import.
 * Opens /offline first because that page has no household screen that could
 * react to the data.
 */
export async function seedCompleteProfile(page: Page) {
  await page.goto("/offline");
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("prepwise", 1);
        open.onupgradeneeded = () => open.result.createObjectStore("household");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("household", "readwrite");
          tx.objectStore("household").put(
            {
              id: crypto.randomUUID(),
              schemaVersion: 1,
              updatedAt: new Date().toISOString(),
              status: "complete",
              completedSteps: ["people", "pets", "housing", "needs"],
              people: { adults: 2, seniors: 0, children: 1, smallChildren: 0 },
              hasPets: true,
              pets: { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 1, otherSmall: 0 },
              housingType: "flat",
              needs: ["regularMedicines"],
            },
            "current",
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

/** The S-01 record still in IndexedDB, or undefined once the app has imported it. */
export async function readV1Record(page: Page): Promise<unknown> {
  return page.evaluate(
    () =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open("prepwise", 1);
        open.onupgradeneeded = () => open.result.createObjectStore("household");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const request = db
            .transaction("household", "readonly")
            .objectStore("household")
            .get("current");
          request.onsuccess = () => {
            db.close();
            resolve(request.result);
          };
          request.onerror = () => reject(request.error);
        };
      }),
  );
}

/**
 * Creates the plan the way a person does: "Stwórz plan" on the overview, then
 * the generating screen, which stores the device's plan flag before the plan
 * opens. Needs a complete profile (seedCompleteProfile). Works offline.
 */
export async function createPlanThroughUi(page: Page) {
  await page.goto("/pl/household");
  await page.getByRole("button", { name: "Stwórz plan" }).click();
  await expect(page).toHaveURL(/\/pl\/plan$/);
}
