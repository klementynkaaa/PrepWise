import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { OptionCheckbox } from "../OptionCheckbox";
import { OptionRadio } from "../OptionRadio";
import { OptionGroup } from "./OptionGroup";

/**
 * Zbiera karty opcji w jedną grupę z nazwą, którą czytnik ekranu ogłasza
 * przed pierwszą opcją. Używaj do kilku opcji `OptionRadio` albo
 * `OptionCheckbox`. Gdy tytuł strony już mówi, o co pytamy, ukryj nazwę
 * (`hideLegend`), ale nie pomijaj jej. Nie używaj dla pojedynczej opcji.
 */
const meta = {
  title: "Formularz/OptionGroup",
  component: OptionGroup,
  tags: ["autodocs"],
  args: { legend: "Gdzie mieszkasz?", children: null },
} satisfies Meta<typeof OptionGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

function Radios() {
  const [value, setValue] = useState("flat");
  return (
    <>
      <OptionRadio
        name="housing"
        value="flat"
        label="Mieszkanie w bloku"
        description="Zapasy trzymasz w mieszkaniu."
        checked={value === "flat"}
        onChange={setValue}
      />
      <OptionRadio
        name="housing"
        value="house"
        label="Dom jednorodzinny"
        description="Masz więcej miejsca na zapasy."
        checked={value === "house"}
        onChange={setValue}
      />
    </>
  );
}

export const WithRadios: Story = {
  render: (args) => (
    <OptionGroup {...args}>
      <Radios />
    </OptionGroup>
  ),
};

function Checkboxes() {
  const [meds, setMeds] = useState(false);
  const [diet, setDiet] = useState(false);
  return (
    <>
      <OptionCheckbox
        label="Leki przyjmowane na stałe"
        description="Ktoś w domu bierze leki codziennie."
        checked={meds}
        onChange={setMeds}
      />
      <OptionCheckbox label="Specjalna dieta lub alergia" checked={diet} onChange={setDiet} />
    </>
  );
}

export const WithCheckboxes: Story = {
  args: { legend: "Czy w domu są szczególne potrzeby?" },
  render: (args) => (
    <OptionGroup {...args}>
      <Checkboxes />
    </OptionGroup>
  ),
};

/** Nazwa grupy jest ukryta wizualnie, ale czytnik ekranu ją ogłasza. */
export const HiddenLegend: Story = {
  args: { hideLegend: true },
  render: (args) => (
    <OptionGroup {...args}>
      <Radios />
    </OptionGroup>
  ),
};
