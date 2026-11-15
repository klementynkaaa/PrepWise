import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Logo } from "./Logo";

const meta = {
  title: "Podstawy/Logo",
  component: Logo,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Logo PREPWISE: znak obok nazwy, znak mniej więcej tak wysoki jak napis. " +
          "Rozmiar `sm` (znak 20, napis 18) jest do nagłówka, " +
          "rozmiar `md` (znak 32, napis 24) do ekranu powitalnego na telefonie, " +
          "rozmiar `lg` (znak 40, napis 30) do ekranu powitalnego na szerokim oknie. " +
          "Nie używaj go w wierszach list ani jako ozdoby w treści. " +
          "Dla czytnika ekranu to jeden obrazek z nazwą „PREPWISE”.",
      },
    },
  },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = { args: { size: "sm" } };

export const Medium: Story = { args: { size: "md" } };

export const Large: Story = { args: { size: "lg" } };

/** Narrow container, as at a large system font size: the logo keeps its one line. */
export const LargeText: Story = {
  args: { size: "lg" },
  decorators: [
    (Story) => (
      <div className="w-72 text-center">
        <Story />
      </div>
    ),
  ],
};
