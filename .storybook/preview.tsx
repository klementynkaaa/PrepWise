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
    (Story) => (
      // The app column on the mist background, in Polish.
      <div lang="pl" className={`${plusJakarta.variable} mx-auto max-w-app font-sans text-ink`}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
