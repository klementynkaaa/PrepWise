import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Divider, PanelList } from "./Panel";
import { ProgressBar, ProgressBarRow, ProgressRing } from "./Progress";

const meta = {
  title: "Postęp/ProgressRing",
  component: ProgressRing,
  tags: ["autodocs"],
  args: { done: 12, total: 38 },
  argTypes: {
    done: { control: { type: "range", min: 0, max: 38 } },
    total: { control: { type: "number", min: 0 } },
  },
} satisfies Meta<typeof ProgressRing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Partial: Story = {};
export const Empty: Story = { args: { done: 0 } };
export const Complete: Story = { args: { done: 38 } };

export const Bar: Story = { render: (args) => <ProgressBar {...args} /> };

/** The count is always shown; a complete group says "Gotowe" instead of 100 %. */
export const BarRows: Story = {
  render: () => (
    <PanelList>
      <ProgressBarRow name="Woda i jedzenie" done={0} total={7} detail="zacznij od wody" />
      <Divider />
      <ProgressBarRow name="Światło i łączność" done={4} total={7} detail="brakuje m.in. radia" />
      <Divider />
      <ProgressBarRow name="Ciepło" done={3} total={3} />
    </PanelList>
  ),
};
