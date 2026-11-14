import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabBar } from "./TabBar";

const meta = {
  title: "Nawigacja/TabBar",
  component: TabBar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    items: [
      { href: "/", label: "Start", icon: "home" },
      { href: "/plan", label: "Plan", icon: "plan" },
      { href: "/lista", label: "Lista", icon: "list" },
      { href: "/dane", label: "Dane", icon: "lock" },
    ],
    currentHref: "/plan",
  },
  argTypes: {
    currentHref: { control: "inline-radio", options: ["/", "/plan", "/lista", "/dane"] },
  },
} satisfies Meta<typeof TabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The current tab is announced as the current page. */
export const PlanCurrent: Story = {};
export const StartCurrent: Story = { args: { currentHref: "/" } };
