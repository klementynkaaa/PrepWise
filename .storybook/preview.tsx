import type { Preview } from "@storybook/nextjs-vite";
import { Plus_Jakarta_Sans } from "next/font/google";
import "../src/app/globals.css";

// Same font as src/app/layout.tsx, so stories use the app's face.
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin", "latin-ext"],
});

const preview: Preview = {
  parameters: {
    nextjs: { appDirectory: true },
    layout: "padded",
    controls: { expanded: true },
    // Any axe violation fails the story's test (npm run test:storybook).
    a11y: { test: "error" },
  },
  decorators: [
    (Story, { parameters }) => (
      // The app column on the mist background, in Polish. A fullscreen story
      // draws its own column, so full-width parts (the tab bar) can span the window.
      <div
        lang="pl"
        className={`${plusJakarta.variable} font-sans text-ink ${parameters.layout === "fullscreen" ? "" : "mx-auto max-w-app"}`}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
