import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Every story runs as a test in Chromium, with axe checks set to fail
// (`a11y.test: "error"` in .storybook/preview.tsx). Kept apart from
// vitest.config.mts so `npm test` and coverage stay browser-free.
const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            // Same browser as playwright.config.ts: full new-headless Chromium (CI
            // installs it with --no-shell).
            provider: playwright({ launchOptions: { channel: "chromium" } }),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
