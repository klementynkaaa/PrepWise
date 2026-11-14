import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/nextjs-vite";

// Storybook is a dev tool for trying components in isolation. It is not part
// of the app: nothing here is exported to out/, precached or deployed.
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  // Illustrations live in public/illustrations/.
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
  // The app compiles Tailwind through a Turbopack loader (next.config.ts);
  // Storybook builds with Vite, so it needs Tailwind's Vite plugin.
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: [...(viteConfig.plugins ?? []), tailwindcss()],
  }),
};

export default config;
