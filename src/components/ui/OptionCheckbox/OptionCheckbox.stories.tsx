import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { OptionCheckbox } from "./OptionCheckbox";

const meta = {
  title: "Formularz/OptionCheckbox",
  component: OptionCheckbox,
  tags: ["autodocs"],
  args: {
    label: "Brak prądu (blackout)",
    description: "Prądu nie ma kilka dni.",
    checkedNote: "Dodamy: latarki, baterie, powerbank, radio na baterie.",
    checked: false,
    onChange: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<typeof args>();
    return (
      <OptionCheckbox
        {...args}
        onChange={(checked) => {
          args.onChange(checked);
          updateArgs({ checked });
        }}
      />
    );
  },
} satisfies Meta<typeof OptionCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

/** Checked: shows what choosing it adds. */
export const Checked: Story = { args: { checked: true } };
