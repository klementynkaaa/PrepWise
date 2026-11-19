import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProgressPanel } from "./ProgressPanel";

const meta = {
  title: "Postęp/ProgressPanel",
  component: ProgressPanel,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Postęp całej listy w jednym panelu: „Gotowe x z y”, jeden pasek i „Zostało N rzeczy do " +
          "odhaczenia.”. Użyj go na górze listy zakupów i na ekranie Start (z tytułem i linkiem do listy). " +
          "Nie dziel go na grupy — każda grupa ma własne „x z y” w nagłówku — i nie używaj go do wczytywania. " +
          "Jako link czytnik ekranu słyszy tylko jego słowa; pasek jest wtedy ukryty przed czytnikiem.",
      },
    },
  },
  args: {
    count: "Gotowe 7 z 22",
    left: "Zostało 15 rzeczy do odhaczenia.",
    done: 7,
    total: 22,
    barLabel: "Gotowe 7 z 22",
  },
} satisfies Meta<typeof ProgressPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    count: "Gotowe 0 z 22",
    left: "Zostały 22 rzeczy do odhaczenia.",
    done: 0,
    barLabel: "Gotowe 0 z 22",
  },
};

export const Partial: Story = {};

export const Done: Story = {
  args: {
    count: "Gotowe 22 z 22",
    left: "Zostało 0 rzeczy do odhaczenia.",
    done: 22,
    barLabel: "Gotowe 22 z 22",
  },
};

/**
 * On Start: the whole panel opens the list. The link is named by its words,
 * so the bar is hidden from screen readers here.
 */
export const AsLink: Story = {
  args: { title: "Gotowość na 72 godziny", href: "/" },
};
