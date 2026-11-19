import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { ChecklistRow } from "./ChecklistRow";
import { PanelList } from "../Panel";

const meta = {
  title: "Lista/ChecklistRow",
  component: ChecklistRow,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Wiersz listy zakupów do odhaczenia: pole wyboru, nazwa z opisem i ilość po prawej. Odhaczony wiersz " +
          "jest szary, z zaznaczonym polem — bez przekreślenia i bez dodatkowego słowa. „Najpierw” oznacza " +
          "pierwszą rzecz do zrobienia. Nie używaj go do wyboru opcji w formularzu (do tego jest " +
          "`OptionCheckbox`) ani do wierszy planu bez odhaczania (`PlanRow`).",
      },
    },
  },
  args: {
    name: "Woda",
    detail: "3 l × 3 osoby × 3 dni",
    quantity: "27 l",
    checked: false,
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <PanelList>
        <Story />
      </PanelList>
    ),
  ],
  render: function Render(args) {
    const [, updateArgs] = useArgs<typeof args>();
    return (
      <ChecklistRow
        {...args}
        onChange={(checked) => {
          args.onChange(checked);
          updateArgs({ checked });
        }}
      />
    );
  },
} satisfies Meta<typeof ChecklistRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unticked: Story = {};

/** Ticked: grey row and a checked box. The quantity stays. */
export const Ticked: Story = { args: { checked: true } };

/** The first unticked thing on the list: tinted, labelled "Najpierw". */
export const First: Story = { args: { first: { label: "Najpierw" } } };

/** Long name and detail wrap; the quantity stays on the right. */
export const LongText: Story = {
  args: {
    name: "Leki przyjmowane na stałe i zapas recept",
    detail: "na 3 dni dla każdej osoby, która je bierze, plus kopia listy leków",
    quantity: "3 opakowania",
  },
};

/**
 * Narrow container, as at a large system font size (200 %): the quantity
 * moves under the name and stays readable.
 */
export const LargeText: Story = {
  args: { first: { label: "Najpierw" } },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};
