import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppHeader } from "./AppHeader";

const meta = {
  title: "Nawigacja/AppHeader",
  component: AppHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Górny pasek aplikacji: logo po lewej, stan zapisu po prawej, w kolumnie 32 rem na każdej szerokości. " +
          "Użyj go na ekranach z dolną nawigacją. Nie używaj go w krokach przepływu (tam jest `TopBar` z linkiem wstecz). " +
          "Przy dużej czcionce stan zapisu przechodzi pod logo.",
      },
    },
  },
  args: {
    saveState: "saved",
    saveLabels: { saved: "Zapisane w telefonie", offline: "Offline · wszystko działa" },
  },
  argTypes: { saveState: { control: "inline-radio", options: ["saved", "offline"] } },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Phone: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } };

export const Tablet: Story = { globals: { viewport: { value: "tablet", isRotated: false } } };

export const Desktop: Story = { globals: { viewport: { value: "desktop", isRotated: false } } };

export const Offline: Story = { args: { saveState: "offline" } };

export const WithoutStatus: Story = { args: { saveState: undefined } };

/** Narrow container, as at a large system font size: the status wraps under the logo. */
export const LargeText: Story = {
  args: { saveState: "offline" },
  decorators: [
    (Story) => (
      <div className="w-60">
        <Story />
      </div>
    ),
  ],
};
