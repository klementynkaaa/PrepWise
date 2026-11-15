import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { OptionRadio } from "./OptionRadio";

/**
 * Jedna opcja do wyboru spośród kilku, np. rodzaj mieszkania. Używaj w
 * `OptionGroup`, żeby czytnik ekranu ogłosił całą grupę. Nie używaj, gdy
 * można zaznaczyć kilka opcji (wtedy `OptionCheckbox`) ani przy wyborze
 * tak/nie z dwiema krótkimi opcjami (wtedy `SegmentedControl`).
 */
const meta = {
  title: "Formularz/OptionRadio",
  component: OptionRadio,
  tags: ["autodocs"],
  args: {
    name: "housing",
    value: "flat",
    label: "Mieszkanie w bloku",
    description: "Zapasy trzymasz w mieszkaniu, bez piwnicy ani garażu.",
    checked: false,
    onChange: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<typeof args>();
    return (
      <OptionRadio
        {...args}
        onChange={(value) => {
          args.onChange(value);
          updateArgs({ checked: true });
        }}
      />
    );
  },
} satisfies Meta<typeof OptionRadio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Zaznaczona: tło w kolorze akcentu i mocna obwódka. */
export const Selected: Story = { args: { checked: true } };

/** Fokus z klawiatury: widoczna obwódka natywnego przycisku. */
export const Focus: Story = {
  play: async ({ canvasElement }) => {
    canvasElement.querySelector("input")?.focus();
  },
};

export const LongText: Story = {
  args: {
    label: "Dom jednorodzinny z ogrodem, piwnicą i garażem na dwa samochody",
    description:
      "Masz sporo miejsca na zapasy, ale pamiętaj, że w razie ewakuacji trzeba wziąć tylko to, co zmieści się w plecaku.",
  },
};
