import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FactChip, PriorityHeader, SaveStatus } from "./Status";

const meta = {
  title: "Komunikaty/SaveStatus",
  component: SaveStatus,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "`SaveStatus` mówi, gdzie są dane (zapisane w telefonie albo offline). Dla czytnika ekranu to komunikat na żywo. " +
          "`FactChip` ma ten sam wygląd, ale jest zwykłym tekstem: użyj go do stałego faktu, który się nie zmienia. " +
          "Nie używaj żadnego z nich do przycisków ani do statusu pozycji na liście.",
      },
    },
  },
  args: {
    state: "saved",
    labels: { saved: "Zapisane w telefonie", offline: "Offline · wszystko działa" },
  },
  argTypes: { state: { control: "inline-radio", options: ["saved", "offline"] } },
} satisfies Meta<typeof SaveStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saved: Story = {};
export const Offline: Story = { args: { state: "offline" } };

/** Read as "Priorytet 2: Światło i łączność". */
export const Priority: Story = {
  render: () => (
    <PriorityHeader tier={2} tierLabel="Priorytet 2">
      Światło i łączność
    </PriorityHeader>
  ),
};

/** A fixed fact: same pill, but plain text (no live region). */
export const Fact: Story = {
  render: () => <FactChip>Dane zostają w telefonie</FactChip>,
};

export const FactLongText: Story = {
  render: () => (
    <div className="w-72">
      <FactChip>Dane zostają w telefonie i nigdzie nie wychodzą</FactChip>
    </div>
  ),
};

/** Narrow container, as at a large system font size: the pill keeps its single line. */
export const FactLargeText: Story = {
  render: () => (
    <div className="w-48">
      <FactChip>Dane zostają w telefonie</FactChip>
    </div>
  ),
};
