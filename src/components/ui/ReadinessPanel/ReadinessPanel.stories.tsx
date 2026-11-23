import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SectionHeader } from "../SectionHeader";
import { ReadinessPanel, ReadinessRow } from "./ReadinessPanel";

const meta = {
  title: "Postęp/ReadinessPanel",
  component: ReadinessPanel,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Gotowość w jednym białym panelu: duży pierścień z procentem, „Gotowe x z y” i jedno krótkie zdanie. " +
          "Gdy plan ma plecak ewakuacyjny, dodaj `ReadinessRow` pod cienką linią: po jednym wierszu na część listy " +
          "(zapasy w domu, plecak), każdy jest osobnym linkiem do listy, z obrazkiem 52 px, nazwą, liczbą „12 z 35”, paskiem i strzałką. " +
          "Użyj go na ekranie Start, pod `SectionHeader`; nie używaj go na liście ani w Planie (tam jest `ProgressPanel`). " +
          "Pierścień i pasek są dla czytnika ekranu ukryte: czyta on słowa. Przy dużym tekście liczba spada pod nazwę.",
      },
    },
  },
  args: {
    done: 15,
    total: 45,
    percent: "33%",
    count: "Gotowe 15 z 45",
    note: "Dobrze idzie. Zostało 30 rzeczy.",
  },
  decorators: [
    (Story) => (
      <div className="flex flex-col gap-2">
        <SectionHeader title="Gotowość na 72 godziny" action={{ href: "/", label: "Plan" }} />
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReadinessPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = (home: [number, number], backpack: [number, number]) => (
  <>
    <ReadinessRow
      href="/"
      illustration="item-food"
      name="Zapasy w domu"
      count={`${home[0]} z ${home[1]}`}
      done={home[0]}
      total={home[1]}
    />
    <ReadinessRow
      href="/"
      illustration="item-backpack"
      name="Plecak ewakuacyjny"
      count={`${backpack[0]} z ${backpack[1]}`}
      done={backpack[0]}
      total={backpack[1]}
    />
  </>
);

/** Plan bez plecaka: sam pierścień i zdanie, bez wierszy. */
export const NoBackpack: Story = {};

/** Nic jeszcze nie odhaczono. */
export const Empty: Story = {
  args: {
    done: 0,
    percent: "0%",
    count: "Gotowe 0 z 45",
    note: "Zacznij od zapasów w domu — plecak spakujesz potem.",
  },
  render: (args) => <ReadinessPanel {...args}>{rows([0, 35], [0, 10])}</ReadinessPanel>,
};

/** W trakcie, z plecakiem. */
export const InProgress: Story = {
  render: (args) => <ReadinessPanel {...args}>{rows([12, 35], [3, 10])}</ReadinessPanel>,
};

/** Wszystko odhaczone: w pierścieniu pojawia się znaczek zamiast procentu. */
export const Complete: Story = {
  args: { done: 45, percent: "100%", count: "Gotowe 45 z 45", note: "Wszystko odhaczone." },
  render: (args) => <ReadinessPanel {...args}>{rows([35, 35], [10, 10])}</ReadinessPanel>,
};

/** Długie nazwy zawijają się, a liczba spada pod nazwę przy dużym tekście. */
export const LongText: Story = {
  render: (args) => (
    <ReadinessPanel {...args} note="Dobrze idzie. Zostało 30 rzeczy, w tym leki i dokumenty.">
      <ReadinessRow
        href="/"
        illustration="item-water"
        name="Zapasy w domu na wypadek braku prądu, wody i ogrzewania jednocześnie"
        count="12 z 35"
        done={12}
        total={35}
      />
      <ReadinessRow
        href="/"
        illustration="item-backpack"
        name="Plecak ewakuacyjny dla całej rodziny, razem z dokumentami i lekami"
        count="3 z 10"
        done={3}
        total={10}
      />
    </ReadinessPanel>
  ),
};
