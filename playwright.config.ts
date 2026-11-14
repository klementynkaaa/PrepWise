import { defineConfig, devices } from "@playwright/test";

// Browser tests run against the already built static export in out/.
// Run `npm run build` first; this config does not rebuild.
//
// With SMOKE_BASE_URL set the same config targets a deployed URL instead: no
// local server, and no trace, screenshot, video or HTML report, because those
// record request headers and the bypass secret travels in one.
const port = 3100;
const remoteURL = process.env.SMOKE_BASE_URL;
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: remoteURL ? "list" : process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: remoteURL
    ? {
        baseURL: remoteURL,
        trace: "off",
        screenshot: "off",
        video: "off",
        ...(bypassSecret && {
          extraHTTPHeaders: {
            "x-vercel-protection-bypass": bypassSecret,
            "x-vercel-set-bypass-cookie": "true",
          },
        }),
      }
    : {
        baseURL: `http://localhost:${port}`,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
      },
  projects: [
    {
      name: "chromium",
      // channel: "chromium" selects the full new-headless Chromium, not chromium-headless-shell.
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
  ],
  webServer: remoteURL
    ? undefined
    : {
        command: `npx serve out -l ${port}`,
        url: `http://localhost:${port}`,
        reuseExistingServer: !process.env.CI,
      },
});
