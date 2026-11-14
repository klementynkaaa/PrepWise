import { expect, test } from "@playwright/test";

// Health checks for a deployed URL. The header checks come from vercel.json,
// which `serve` does not apply, so they only run against a non-local URL.
const remote = process.env.SMOKE_BASE_URL;
const isLocal = !remote || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(remote);

test("@smoke /version.json is served and matches the expected commit", async ({ request }) => {
  const response = await request.get("/version.json");
  expect(response.status()).toBe(200);
  const version = (await response.json()) as { sha?: string; builtAt?: string };
  expect(typeof version.sha).toBe("string");
  if (process.env.EXPECTED_SHA) {
    expect(version.sha).toBe(process.env.EXPECTED_SHA);
  }
});

test("@smoke /sw.js is served with Cache-Control no-cache", async ({ request }) => {
  test.skip(isLocal, "Headers from vercel.json are not applied by the local server");
  const response = await request.get("/sw.js");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-cache");
});

test("@smoke /manifest.webmanifest has the manifest content type", async ({ request }) => {
  test.skip(isLocal, "Headers from vercel.json are not applied by the local server");
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/manifest+json");
});
