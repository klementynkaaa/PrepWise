import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { ChecklistRow } from "../ChecklistRow";
import { PanelList } from "../Panel";
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
 * A finished group on the list: the header is a disclosure button ("✓ 2 z 2"
 * and a chevron). Tapping it opens or folds the group's rows.
 */
function FoldedGroup({ initiallyExpanded }: { initiallyExpanded: boolean }) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  return (
    <PanelList>
      <PriorityHeader
        tier={1}
        tierLabel="Priorytet 1"
        meta="2 z 2"
        collapse={{
          expanded,
          onToggle: () => setExpanded((open) => !open),
          controls: "group-1-rows",
        }}
      >
        Najważniejsze
      </PriorityHeader>
      <div id="group-1-rows" hidden={!expanded}>
        <ChecklistRow name="Woda" quantity="27 l" checked onChange={() => {}} />
        <ChecklistRow name="Jedzenie" quantity="27 porcji" checked onChange={() => {}} />
      </div>
    </PanelList>
  );
}

export const Collapsed: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`PriorityHeader` z `collapse`: ukończona grupa na liście zwija się do nagłówka-przycisku. " +
          "Użyj go tylko dla grupy, w której wszystko jest odhaczone; nie używaj go do sekcji planu ani " +
          "do grup, w których coś zostało do zrobienia.",
      },
    },
  },
  render: () => <FoldedGroup initiallyExpanded={false} />,
};

export const Expanded: Story = { render: () => <FoldedGroup initiallyExpanded /> };

/** Keyboard focus on the disclosure button, as after a tick folds the group. */
export const CollapsedFocus: Story = {
  render: () => <FoldedGroup initiallyExpanded={false} />,
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    const button = within(canvasElement).getByRole("button", { expanded: false });
    await expect(button).toHaveFocus();
  },
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
