import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Store integration tests on PowerSync's real local database, in Chromium
// (`*.browser.test.ts`). Kept apart from vitest.config.mts so the unit,
// integration and component projects and their coverage stay browser-free.
// Needs PowerSync's worker and WASM in public/@powersync: `npm run assets`
// (run by `npm test` and `npm run test:store`).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  // Serves the copied worker at /@powersync/worker.js, as the app does.
  publicDir: "public",
  optimizeDeps: { exclude: ["@powersync/web"] },
  worker: { format: "es" },
  define: { "process.env": "{}" },
  test: {
    name: "store",
    include: ["src/**/*.browser.test.ts"],
    browser: {
      enabled: true,
      headless: true,
      // Same browser as playwright.config.ts: full new-headless Chromium (CI
      // installs it with --no-shell). WebKit is left out: its test contexts are
      // ephemeral, like a private window, and have no origin private file system.
      provider: playwright({ launchOptions: { channel: "chromium" } }),
      instances: [{ browser: "chromium" }],
    },
    // The PowerSync store files are left out of the main coverage run; the same
    // 80% floor applies to them here.
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["src/lib/household/powersync-store.ts", "src/lib/household/powersync-schema.ts"],
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage/store",
      thresholds: { lines: 80 },
    },
  },
});
