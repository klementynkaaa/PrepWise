import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SectionHeader } from "./SectionHeader";

const meta = {
  title: "Układ/SectionHeader",
  component: SectionHeader,
  tags: ["autodocs"],
  args: { title: "Co dalej" },
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithCount: Story = { args: { meta: "12 z 38 gotowe" } };
export const WithLink: Story = {
  args: { title: "Twój plan", action: { href: "/", label: "Zobacz wszystko" } },
};
