import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton, SkeletonGroup } from "./Skeleton";

const meta = {
  title: "Komunikaty/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "`Skeleton` to szare bloki, które trzymają kształt strony, dopóki dane z telefonu się otwierają (np. plan). " +
          "Kształty: `line` (wiersz tekstu), `block` (panel lub wiersz listy) i `banner` (miejsce na baner). " +
          "Bloki są ukryte przed czytnikiem ekranu; zawsze owiń je w `SkeletonGroup`, który raz mówi „Wczytywanie…” (tekst pojawia się tuż po wyświetleniu, żeby czytnik go przeczytał). " +
          "Gdy strona sama oznacza `<main aria-busy>`, ustaw w grupie `busy={false}` — zagnieżdżone obszary „zajęte” mogą zagłuszyć komunikat. " +
          "Nie używaj go do pustych list, błędów ani trybu offline (jest do tego `EmptyState`), ani gdy czekanie trwa ułamek sekundy i nic by nie mignęło.",
      },
    },
  },
  args: { shape: "line" },
  argTypes: { shape: { control: "inline-radio", options: ["line", "block", "banner"] } },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every story but `InsideBusyMain` sits in a busy group, as on a page. */
const inGroup: Story["decorators"] = [
  (Story) => (
    <SkeletonGroup label="Wczytywanie…">
      <Story />
    </SkeletonGroup>
  ),
];

export const Line: Story = { decorators: inGroup };
export const Block: Story = { args: { shape: "block" }, decorators: inGroup };
export const Banner: Story = { args: { shape: "banner" }, decorators: inGroup };

/** The plan screen while it opens: banner, a heading line and rows. */
export const PlanShape: Story = {
  decorators: inGroup,
  render: () => (
    <>
      <Skeleton shape="banner" />
      <Skeleton className="w-1/2" />
      <Skeleton shape="block" />
      <Skeleton shape="block" />
      <Skeleton shape="block" />
    </>
  ),
};

/** Narrow container, as at a large system font size: the blocks scale with rem. */
export const LargeText: Story = {
  decorators: inGroup,
  render: () => (
    <div className="flex w-48 flex-col gap-3">
      <Skeleton shape="banner" />
      <Skeleton />
      <Skeleton shape="block" />
    </div>
  ),
};

/** Inside a page whose `<main>` is already busy: the group leaves `aria-busy` to it. */
export const InsideBusyMain: Story = {
  decorators: [
    (Story) => (
      <main aria-busy="true" className="flex flex-col gap-3">
        <SkeletonGroup label="Wczytywanie…" busy={false}>
          <Story />
        </SkeletonGroup>
      </main>
    ),
  ],
  render: () => (
    <>
      <Skeleton shape="banner" />
      <Skeleton shape="block" />
    </>
  ),
};
