import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PriorityHeader, SaveStatus } from "./Status";

const meta = {
  title: "Komunikaty/SaveStatus",
  component: SaveStatus,
  tags: ["autodocs"],
  args: { state: "saved" },
  argTypes: { state: { control: "inline-radio", options: ["saved", "offline"] } },
} satisfies Meta<typeof SaveStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saved: Story = {};
export const Offline: Story = { args: { state: "offline" } };

/** Read as "Priorytet 2: Światło i łączność". */
export const Priority: Story = {
  render: () => <PriorityHeader tier={2}>Światło i łączność</PriorityHeader>,
};
