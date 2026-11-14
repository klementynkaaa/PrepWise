import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Icon, type IconName } from "./icons";

const names: IconName[] = [
  "home",
  "plan",
  "list",
  "lock",
  "info",
  "offline",
  "back",
  "plus",
  "minus",
  "check",
  "close",
];

const meta = {
  title: "Podstawy/Icon",
  component: Icon,
  tags: ["autodocs"],
  args: { name: "home", size: "md" },
  argTypes: {
    name: { control: "select", options: names },
    size: { control: "inline-radio", options: ["md", "lg"] },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Decorative: the control around an icon carries the name. */
export const Single: Story = {};

export const All: Story = {
  render: (args) => (
    <ul className="grid grid-cols-4 gap-3">
      {names.map((name) => (
        <li key={name} className="flex flex-col items-center gap-1 text-caption text-ink-muted">
          <Icon name={name} size={args.size} />
          {name}
        </li>
      ))}
    </ul>
  ),
};
