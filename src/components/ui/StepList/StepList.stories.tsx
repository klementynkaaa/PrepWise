import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ButtonLink } from "../Button";
import { SectionHeader } from "../SectionHeader";
import { Step, StepList } from "./StepList";

const meta = {
  title: "Podstawy/StepList",
  component: StepList,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Pionowa lista kroków w białym panelu: zrobiony krok (wypełnione kółko z ptaszkiem, nazwa przygaszona), " +
          "bieżący (tło w kolorze akcentu, kółko z kropką, podpis i mały przycisk) i późniejszy (puste kółko, nazwa i podpis). " +
          "Użyj jej na ekranie Start w „Do zrobienia”, nad nią daj `SectionHeader` z „Krok x z y”. " +
          "Nie używaj jej do kroków formularza (jest do tego `Stepper`) ani do długich list. " +
          "Stan czytnik ekranu słyszy jako ukryte słowo („zrobione”, „teraz”, „później”), nie tylko jako kolor i kształt.",
      },
    },
  },
  args: { children: null },
  decorators: [
    (Story) => (
      <div className="flex flex-col gap-2">
        <SectionHeader title="Do zrobienia" meta="Krok 2 z 3" />
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StepList>;

export default meta;
type Story = StoryObj<typeof meta>;

const planDone = (
  <Step
    state="done"
    statusLabel="zrobione"
    name="Plan gotowy"
    caption="Policzony dla Waszego domu."
  />
);
const open = (
  <ButtonLink href="/" size="small">
    Otwórz listę zakupów
  </ButtonLink>
);

/** Krok drugi z trzech w toku. */
export const Current: Story = {
  render: () => (
    <StepList>
      {planDone}
      <Step
        state="current"
        statusLabel="teraz"
        name="Skompletuj zapasy"
        caption="Zostało 23 rzeczy z listy zakupów."
        action={open}
      />
      <Step
        state="later"
        statusLabel="później"
        name="Spakuj plecak ewakuacyjny"
        caption="10 rzeczy na szybkie wyjście."
      />
    </StepList>
  ),
};

/** Dwa kroki, gdy plan nie ma plecaka. */
export const TwoSteps: Story = {
  render: () => (
    <StepList>
      {planDone}
      <Step
        state="current"
        statusLabel="teraz"
        name="Skompletuj zapasy"
        caption="Zostało 23 rzeczy z listy zakupów."
        action={open}
      />
    </StepList>
  ),
};

/** Wszystkie kroki zrobione. */
export const AllDone: Story = {
  render: () => (
    <StepList>
      {planDone}
      <Step
        state="done"
        statusLabel="zrobione"
        name="Skompletuj zapasy"
        caption="Wszystko odhaczone."
      />
      <Step
        state="done"
        statusLabel="zrobione"
        name="Spakuj plecak ewakuacyjny"
        caption="Plecak spakowany."
      />
    </StepList>
  ),
};

/** Długi tekst zawija się; przycisk zostaje pod podpisem. */
export const LongText: Story = {
  render: () => (
    <StepList>
      {planDone}
      <Step
        state="current"
        statusLabel="teraz"
        name="Skompletuj zapasy na wypadek braku prądu, wody i ogrzewania jednocześnie"
        caption="Zostało 123 rzeczy z listy zakupów, w tym leki, dokumenty i jedzenie dla zwierząt."
        action={open}
      />
      <Step
        state="later"
        statusLabel="później"
        name="Spakuj plecak ewakuacyjny dla całej rodziny"
        caption="10 rzeczy na szybkie wyjście z domu, gdyby trzeba było go opuścić."
      />
    </StepList>
  ),
};
