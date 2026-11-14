import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Divider, PanelList } from "./Panel";
import { PlanRow } from "./PlanRow";
import { PriorityHeader } from "./Status";

const meta = {
  title: "Plan/PlanRow",
  component: PlanRow,
  tags: ["autodocs"],
  args: {
    name: "Woda pitna",
    quantity: "27 l",
    formula: "3 l × 3 osoby × 3 dni",
    source: "official",
  },
  argTypes: { source: { control: "inline-radio", options: ["official", "prepwise"] } },
  decorators: [
    (Story) => (
      <PanelList>
        <Story />
      </PanelList>
    ),
  ],
} satisfies Meta<typeof PlanRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The first thing to do: highlighted, labelled "Najpierw". */
export const First: Story = { args: { first: true } };

export const PrepwiseEstimate: Story = {
  args: {
    name: "Woda dla psa",
    quantity: "4,5 l",
    formula: "0,5 l × 1 zwierzę × 3 dni · na 10 kg wagi",
    source: "prepwise",
  },
};

export const AsLink: Story = { args: { href: "/" } };

/** A priority panel. Rows stack at large text (container query). */
export const PriorityGroup: Story = {
  render: () => (
    <>
      <PriorityHeader tier={1}>Woda i jedzenie</PriorityHeader>
      <PlanRow
        first
        name="Woda pitna"
        quantity="27 l"
        formula="3 l × 3 osoby × 3 dni"
        source="official"
      />
      <Divider />
      <PlanRow
        name="Jedzenie bez gotowania"
        quantity="27 porcji"
        formula="3 posiłki × 3 osoby × 3 dni"
        source="official"
      />
      <Divider />
      <PlanRow
        name="Woda dla psa"
        quantity="4,5 l"
        formula="0,5 l × 1 zwierzę × 3 dni · na 10 kg wagi"
        source="prepwise"
      />
    </>
  ),
};

/** Narrow container: what 200 % text does to a row. */
export const Stacked: Story = {
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};
