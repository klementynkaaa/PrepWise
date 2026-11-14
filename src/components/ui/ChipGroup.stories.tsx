import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { ChipGroup, ChipLink } from "./ChipGroup";

const meta = {
  title: "Formularz/ChipGroup",
  component: ChipGroup<string>,
  tags: ["autodocs"],
  args: {
    label: "Pokaż",
    options: [
      { value: "all", label: "Wszystko" },
      { value: "missing", label: "Brakuje" },
      { value: "done", label: "Mam" },
    ],
    value: "all",
    onChange: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<typeof args>();
    return (
      <ChipGroup
        {...args}
        onChange={(value) => {
          args.onChange(value);
          updateArgs({ value });
        }}
      />
    );
  },
} satisfies Meta<typeof ChipGroup<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filters: Story = {};

/** A trailing link chip, outside the radiogroup. */
export const WithAddLink: Story = {
  args: { after: <ChipLink href="/">+ Dodaj sytuację</ChipLink> },
};
