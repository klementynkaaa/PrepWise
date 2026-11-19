import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FactChip, PriorityBadge, PriorityHeader, SaveStatus } from "./Status";

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

/** Nagłówek panelu planu z liczbą rzeczy po prawej. */
export const PriorityWithCount: Story = {
  render: () => (
    <PriorityHeader tier={1} tierLabel="Priorytet 1" meta="4 rzeczy">
      Najważniejsze
    </PriorityHeader>
  ),
};

/** Sekcja bez priorytetu (np. „Dla psa”): ten sam nagłówek, bez numeru. */
export const SectionWithoutTier: Story = {
  render: () => <PriorityHeader meta="3 rzeczy">Dla psa</PriorityHeader>,
};

/**
 * Sam numer priorytetu, np. na kafelku planu na ekranie Start. Jest ozdobny:
 * priorytet trzeba podać słowami obok (np. ukryte „Priorytet 1:”).
 */
export const Badge: Story = {
  render: () => (
    <p className="flex items-center gap-2 text-control font-bold">
      <PriorityBadge tier={1} />
      <span className="sr-only">Priorytet 1: </span>
      Najważniejsze
    </p>
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
