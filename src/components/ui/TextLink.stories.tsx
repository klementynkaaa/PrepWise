import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BackLink, TextLink } from "./TextLink";

const meta = {
  title: "Akcje/TextLink",
  component: TextLink,
  tags: ["autodocs"],
  args: { href: "/", children: "Skąd te ilości?" },
} satisfies Meta<typeof TextLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Back: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <BackLink href="/" />
      <BackLink href="/">Start</BackLink>
    </div>
  ),
};
