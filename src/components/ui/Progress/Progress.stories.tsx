import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Divider, PanelList } from "../Panel";
import { ProgressBar, ProgressBarRow, ProgressRing } from "./Progress";

const meta = {
  title: "Postęp/ProgressRing",
  component: ProgressRing,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Pierścień, pasek i wiersz z paskiem pokazują, ile rzeczy jest gotowych. Słowa (np. „Gotowe 12 z 38”) " +
          "przychodzą z ekranu, z `messages/pl.json`. Użyj ich obok widocznej liczby; nie używaj ich jako " +
          "jedynej informacji o postępie ani do wczytywania.",
      },
    },
  },
  args: { done: 12, total: 38, label: "Gotowe 12 z 38", fraction: "12/38" },
  argTypes: {
    done: { control: { type: "range", min: 0, max: 38 } },
    total: { control: { type: "number", min: 0 } },
  },
} satisfies Meta<typeof ProgressRing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Partial: Story = {};
/** 80px ring at the top of a screen (Start). */
export const Large: Story = { args: { size: "lg" } };
export const Empty: Story = { args: { done: 0, label: "Gotowe 0 z 38", fraction: "0/38" } };
export const Complete: Story = { args: { done: 38, label: "Gotowe 38 z 38", fraction: "38/38" } };

export const Bar: Story = {
  render: ({ done, total, label }) => <ProgressBar done={done} total={total} label={label} />,
};

/** The count is always shown; a complete group says "Gotowe" instead of 100 %. */
export const BarRows: Story = {
  render: () => (
    <PanelList>
      <ProgressBarRow
        name="Woda i jedzenie"
        count="0 z 7"
        label="Gotowe 0 z 7"
        done={0}
        total={7}
        detail="zacznij od wody"
      />
      <Divider />
      <ProgressBarRow
        name="Światło i łączność"
        count="4 z 7"
        label="Gotowe 4 z 7"
        done={4}
        total={7}
        detail="brakuje m.in. radia"
      />
      <Divider />
      <ProgressBarRow name="Ciepło" count="3 z 3" label="Gotowe 3 z 3" done={3} total={3} />
    </PanelList>
  ),
};
