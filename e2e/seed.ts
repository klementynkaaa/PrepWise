import type { Page } from "@playwright/test";

/**
 * Saves a complete household (two adults, a cat, a flat) in the browser's
 * IndexedDB, in the format of src/lib/household. Opens /offline first because
 * that page has no household screen that could react to the data.
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
