import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Illustration, illustrationNames } from "./Illustration";

const meta = {
  title: "Podstawy/Illustration",
  component: Illustration,
  tags: ["autodocs"],
  args: { name: "offline" },
  argTypes: { name: { control: "select", options: illustrationNames } },
} satisfies Meta<typeof Illustration>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {};

/** All 21, at their group's size. Screen readers skip them. */
export const All: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3">
      {illustrationNames.map((name) => (
        <figure
          key={name}
          className="flex flex-col items-center gap-2 rounded-md bg-surface p-3 shadow-panel"
        >
          <Illustration name={name} />
          <figcaption className="text-caption text-ink-muted">{name}</figcaption>
        </figure>
      ))}
    </div>
  ),
};
