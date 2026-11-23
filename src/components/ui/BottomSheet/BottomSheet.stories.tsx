import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { BottomSheet } from "./BottomSheet";
import { Button } from "../Button";
import { Alert } from "../Notices";
import { KeyValueRow } from "../Panel";
import { SourcePill } from "../Pills";

const defaultContent = (close: () => void) => (
  <>
    <p className="text-body">
      Liczymy: ilość na osobę na dzień × liczba osób × liczba dni. Wodę liczymy po 3 litry na osobę
      dziennie.
    </p>
    <div className="flex flex-col">
      <KeyValueRow label="Woda na osobę i dzień" value="3 l" />
      <KeyValueRow label="Osoby" value="3" />
      <KeyValueRow label="Dni" value="3" />
    </div>
    <SourcePill
      source="official"
      labels={{ short: "Oficjalne", spoken: "źródło: zalecenie oficjalne" }}
    />
    <Button onClick={close}>Rozumiem</Button>
  </>
);

const meta = {
  title: "Nakładki/BottomSheet",
  component: BottomSheet,
  tags: ["autodocs"],
  args: {
    open: false,
    onClose: fn(),
    title: "Skąd te ilości?",
    closeLabel: "Zamknij",
    children: null,
  },
  // Opened from a trigger, so focus returns to it on close (Escape, scrim, ×).
  render: function Render(args) {
    const [, updateArgs] = useArgs<typeof args>();
    const close = () => {
      args.onClose();
      updateArgs({ open: false });
    };
    return (
      <>
        <Button variant="secondary" size="small" onClick={() => updateArgs({ open: true })}>
          Skąd te ilości?
        </Button>
        <BottomSheet {...args} onClose={close}>
          {args.children ?? defaultContent(close)}
        </BottomSheet>
      </>
    );
  },
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = { args: { open: true } };

/** Główny przycisk i linia stanu zostają w polu widzenia, a treść nad nimi się przewija. */
export const WithFooter: Story = {
  args: {
    open: true,
    title: "Sytuacje",
    footer: (
      <div className="flex flex-col gap-2">
        <p className="text-body-sm text-ink-muted">W planie z sytuacji: 3 rzeczy.</p>
        <Button>Gotowe</Button>
      </div>
    ),
  },
};

/** Błąd zapisu: komunikat i ponowienie nie chowają się pod krawędzią. */
export const WithAlertFooter: Story = {
  args: {
    open: true,
    title: "Sytuacje",
    footer: (
      <div className="flex flex-col gap-3">
        <Alert title="Nie udało się zapisać">Wybór zostaje na ekranie. Spróbuj jeszcze raz.</Alert>
        <Button>Spróbuj ponownie</Button>
      </div>
    ),
  },
};

const longParagraphs = Array.from({ length: 14 }, (_, index) => (
  <p key={index} className="text-body">
    Długa treść arkusza, która nie mieści się na ekranie telefonu, zwłaszcza przy powiększonym
    tekście, więc przewija się nad stopką.
  </p>
));

/** Długa treść: przewija się treść; stopka zostaje. */
export const LongContent: Story = {
  args: {
    open: true,
    title: "Sytuacje",
    children: longParagraphs,
    footer: (
      <div className="flex flex-col gap-2">
        <p className="text-body-sm text-ink-muted">W planie z sytuacji: 19 rzeczy.</p>
        <Button>Gotowe</Button>
      </div>
    ),
  },
};
