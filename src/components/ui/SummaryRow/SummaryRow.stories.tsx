import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SummaryRow } from "./SummaryRow";

/**
 * Wiersz przeglądu zapisanych odpowiedzi: mała etykieta, wartość i link
 * „Zmień”. Używaj na ekranie zapisanego profilu. Nie używaj do samego
 * wyświetlania danych bez akcji (wtedy `KeyValueRow`).
 */
const meta = {
  title: "Panele/SummaryRow",
  component: SummaryRow,
  tags: ["autodocs"],
  args: {
    label: "Domownicy",
    value: "2 dorosłych, 2 dzieci, razem 4 osoby",
    action: { href: "/", label: "Zmień", ariaLabel: "Zmień: Domownicy" },
  },
} satisfies Meta<typeof SummaryRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongValue: Story = {
  args: {
    label: "Szczególne potrzeby",
    value:
      "Leki przyjmowane na stałe, sprzęt medyczny na prąd, trudności z chodzeniem, specjalna dieta lub alergia",
  },
};

export const EmptyValue: Story = {
  args: { label: "Zwierzęta", value: "Brak" },
};
