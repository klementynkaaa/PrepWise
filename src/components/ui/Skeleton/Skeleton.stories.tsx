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
          "Bloki są ukryte przed czytnikiem ekranu; zawsze owiń je w `SkeletonGroup`, który raz mówi „Wczytywanie…”. " +
          "Nie używaj go do pustych list, błędów ani trybu offline (jest do tego `EmptyState`), ani gdy czekanie trwa ułamek sekundy i nic by nie mignęło.",
      },
    },
  },
  args: { shape: "line" },
  argTypes: { shape: { control: "inline-radio", options: ["line", "block", "banner"] } },
  decorators: [
    (Story) => (
      <SkeletonGroup label="Wczytywanie…">
        <Story />
      </SkeletonGroup>
    ),
  ],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};
export const Block: Story = { args: { shape: "block" } };
export const Banner: Story = { args: { shape: "banner" } };

/** The plan screen while it opens: banner, a heading line and rows. */
export const PlanShape: Story = {
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
  render: () => (
    <div className="flex w-48 flex-col gap-3">
      <Skeleton shape="banner" />
      <Skeleton />
      <Skeleton shape="block" />
    </div>
  ),
};
