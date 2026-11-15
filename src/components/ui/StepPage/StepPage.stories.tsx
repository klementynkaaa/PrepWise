import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Panel } from "../Panel";
import { StepPage } from "./StepPage";

/**
 * Jeden układ dla każdego kroku formularza: wstecz i numer kroku, tytuł z
 * krótkim opisem, treść i główny przycisk przypięty na dole. Używaj dla
 * kolejnych kroków. Nie używaj dla ekranów bez głównej akcji ani z
 * ilustracją (kroki jej nie mają).
 */
const meta = {
  title: "Układ/StepPage",
  component: StepPage,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    backHref: "/",
    backLabel: "Wstecz",
    stepLabel: "Krok 1 z 4",
    title: "Kto mieszka z Tobą?",
    lead: "Liczą się wszyscy, którzy na co dzień mieszkają w domu.",
    primaryLabel: "Dalej",
    onPrimary: fn(),
    children: (
      <Panel>
        <p className="text-body">Tu są pytania tego kroku.</p>
      </Panel>
    ),
  },
} satisfies Meta<typeof StepPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Przycisk jest niedostępny i mówi dlaczego. */
export const DisabledWithReason: Story = {
  args: { disabledReason: "Wybierz rodzaj mieszkania, żeby przejść dalej." },
};

export const LongContent: Story = {
  args: {
    children: Array.from({ length: 8 }, (_, index) => (
      <Panel key={index}>
        <p className="text-body">
          Pytanie numer {index + 1}. Treść kroku może być dłuższa niż ekran, wtedy przewija się
          strona, a przycisk zostaje na dole treści.
        </p>
      </Panel>
    )),
  },
};

/** Podsumowanie nad przyciskiem, np. suma osób. */
export const WithSummary: Story = {
  args: { summary: "Razem: 9 osób" },
};
