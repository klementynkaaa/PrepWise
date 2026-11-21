import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { expect, fn, userEvent, within } from "storybook/test";
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

const explanation = (
  <div className="flex flex-col gap-2">
    <p>Przy braku prądu nie działają światło, lodówka ani ładowarki.</p>
    <p className="font-semibold">Dodaje do planu</p>
    <ul className="list-disc pl-5">
      <li>latarka z bateriami</li>
      <li>powerbank</li>
      <li>radio na baterie</li>
    </ul>
    <p className="text-caption text-ink-muted">Źródło: rekomendacja PREPWISE.</p>
  </div>
);

const openDetails: Story["play"] = async ({ canvasElement }) => {
  const button = within(canvasElement).getByRole("button", { name: "Co dodaje?" });
  await userEvent.click(button);
  await expect(button).toHaveAttribute("aria-expanded", "true");
};

const details = { openLabel: "Co dodaje?", closeLabel: "Zwiń", content: explanation };

/**
 * Z rozwijanym wyjaśnieniem pod kartą. Przycisk „Co dodaje?” stoi poza
 * etykietą, więc otwarcie nie zaznacza opcji. Użyj, gdy opcja potrzebuje
 * wyjaśnienia; bez niego zostaw samą kartę.
 */
export const WithDetailsClosed: Story = { args: { details } };

export const WithDetailsOpen: Story = {
  args: { details },
  play: openDetails,
};

export const CheckedAndOpen: Story = {
  args: { details, checked: true },
  play: openDetails,
};

/** Long label, description and explanation wrap; the 44 px button stays. */
export const LongText: Story = {
  args: {
    label: "Brak wody w kranie przez kilka dni z rzędu, także w całym osiedlu",
    description:
      "Woda z kranu nie leci albo nie nadaje się do picia, a sklepy w okolicy mogą być zamknięte.",
    checked: true,
    details: {
      ...details,
      content: (
        <p>
          Długi tekst wyjaśnienia zawija się w kolejne linie i nie wychodzi poza kartę, także przy
          powiększonym tekście w telefonie.
        </p>
      ),
    },
  },
  play: openDetails,
};
