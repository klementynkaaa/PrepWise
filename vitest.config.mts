import { defineConfig } from "vitest/config";

const shared = { resolve: { tsconfigPaths: true } };

export default defineConfig({
  test: {
    projects: [
      {
        ...shared,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          // *.browser.test.ts run in Chromium (vitest.browser.config.mts).
          exclude: ["src/**/*.int.test.ts", "src/**/*.browser.test.ts"],
        },
      },
      {
        ...shared,
        test: {
          name: "integration",
          environment: "jsdom",
          setupFiles: ["src/test/setup-indexeddb.ts"],
          include: ["src/**/*.int.test.ts"],
        },
      },
      {
        ...shared,
        test: {
          name: "components",
          environment: "jsdom",
          setupFiles: ["src/test/setup-dom.ts"],
          include: ["src/**/*.test.tsx"],
        },
      },
      {
        test: {
          name: "scripts",
          environment: "node",
          include: ["scripts/**/*.test.mjs"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        // Needs a real browser: measured by the store tests (vitest.browser.config.mts).
        "src/lib/household/powersync-store.ts",
        "src/lib/household/powersync-schema.ts",
      ],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      thresholds: { lines: 80 },
    },
  },
});
