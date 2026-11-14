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
          exclude: ["src/**/*.int.test.ts"],
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
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      thresholds: { lines: 80 },
    },
  },
});
