import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { SegmentedControl } from "./SegmentedControl";

const meta = {
  title: "Formularz/SegmentedControl",
  component: SegmentedControl<string>,
  tags: ["autodocs"],
  args: {
    label: "Czy macie zwierzęta?",
    options: [
      { value: "yes", label: "Tak" },
      { value: "no", label: "Nie" },
    ],
    value: "no",
    onChange: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<typeof args>();
    return (
      <SegmentedControl
        {...args}
        onChange={(value) => {
          args.onChange(value);
          updateArgs({ value });
        }}
      />
    );
  },
} satisfies Meta<typeof SegmentedControl<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Yes / No. Arrow keys move the choice. */
export const YesNo: Story = {};

export const FullWidth: Story = {
  args: {
    label: "Na ile dni",
    fullWidth: true,
    options: [
      { value: "3", label: "72 h" },
      { value: "7", label: "7 dni" },
      { value: "14", label: "14 dni" },
    ],
    value: "3",
  },
};
