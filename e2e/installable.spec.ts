import { chromium, expect, test } from "@playwright/test";

test("app has no installability errors", async ({ baseURL }, testInfo) => {
  // Regular Playwright contexts are incognito, which Chromium reports as
  // "in-incognito"; a persistent context is a normal profile.
  const context = await chromium.launchPersistentContext(testInfo.outputPath("profile"), {
    channel: "chromium",
  });
  try {
    const page = await context.newPage();
    await page.goto(baseURL ?? "/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    const client = await context.newCDPSession(page);
    const { installabilityErrors } = await client.send("Page.getInstallabilityErrors");
    expect(installabilityErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("@smoke manifest is Polish, standalone and has 192 and 512 icons", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    lang?: string;
    display?: string;
    icons?: { src: string; sizes: string }[];
  };
  expect(manifest.lang).toBe("pl");
  expect(manifest.display).toBe("standalone");

  const sizes = (manifest.icons ?? []).map((icon) => icon.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
  for (const icon of manifest.icons ?? []) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.status(), icon.src).toBe(200);
  }
});
