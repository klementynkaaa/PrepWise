import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MemberChip, SourcePill, StatusPill } from "./Pills";

const meta = {
  title: "Plakietki/SourcePill",
  component: SourcePill,
  tags: ["autodocs"],
  args: { source: "official" },
  argTypes: { source: { control: "inline-radio", options: ["official", "prepwise"] } },
} satisfies Meta<typeof SourcePill>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shown short, read in full ("źródło: zalecenie oficjalne"). */
export const Official: Story = {};
export const Prepwise: Story = { args: { source: "prepwise" } };

/** Missing is neutral, never red: it is the normal state at the start. */
export const Statuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusPill status="missing" />
      <StatusPill status="have" />
      <StatusPill status="done" />
    </div>
  ),
};

export const Members: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <MemberChip>2 dorosłych</MemberChip>
      <MemberChip>1 dziecko</MemberChip>
      <MemberChip>Pies</MemberChip>
    </div>
  ),
};
