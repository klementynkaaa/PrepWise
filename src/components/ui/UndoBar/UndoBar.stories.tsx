import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { UndoBar } from "./UndoBar";

const meta = {
  title: "Lista/UndoBar",
  component: UndoBar,
  tags: ["autodocs"],
  args: { message: "Odznaczono: Kup wodę pitną", onUndo: fn() },
} satisfies Meta<typeof UndoBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Never disappears on its own. */
export const Default: Story = {};
