import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Stepper } from "./Stepper";

const meta = {
  title: "Formularz/Stepper",
  component: Stepper,
  tags: ["autodocs"],
  args: {
    label: "Dorośli",
    hint: "18–64 lata",
    value: 2,
    min: 0,
    max: 12,
    decreaseLabel: "Mniej dorosłych",
    increaseLabel: "Więcej dorosłych",
    onChange: fn(),
  },
  // Controlled: clicks update the `value` control, like a screen would.
  render: function Render(args) {
    const [, updateArgs] = useArgs<typeof args>();
    return (
      <Stepper
        {...args}
        onChange={(value) => {
          args.onChange(value);
          updateArgs({ value });
        }}
      />
    );
  },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** − is unavailable at the minimum and says so to a screen reader. */
export const AtMin: Story = {
  args: {
    label: "Dzieci",
    hint: "do 17 lat",
    value: 0,
    decreaseLabel: "Mniej dzieci",
    increaseLabel: "Więcej dzieci",
  },
};

export const AtMax: Story = { args: { value: 12 } };

export const WithError: Story = {
  args: {
    label: "Osoby w domu",
    hint: undefined,
    value: 0,
    decreaseLabel: "Mniej osób",
    increaseLabel: "Więcej osób",
    error: "Dodaj co najmniej jedną osobę.",
  },
};
