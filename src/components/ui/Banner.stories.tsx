import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Banner } from "./Banner";
import { bannerIllustrationNames } from "./Illustration";

const meta = {
  title: "Podstawy/Banner",
  component: Banner,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Baner: zaokrąglony prostokąt z ilustracją w tle, krótkim tytułem i jednym zdaniem. " +
          "Użyj go raz na ekranie, do spokojnej wiadomości (plan gotowy, woda, instalacja, dłuższy plan). " +
          "Nie używaj go do błędów (jest do tego `Alert`) ani w wierszach list. " +
          "Przy dużym tekście tekst przechodzi nad ilustrację.",
      },
    },
  },
  args: {
    title: "Plan gotowy",
    children: "Sprawdź, czego jeszcze brakuje.",
    illustration: "banner-plan-ready",
  },
  argTypes: { illustration: { control: "select", options: bannerIllustrationNames } },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Water: Story = {
  args: {
    title: "Zacznij od wody",
    children: "To najważniejsza rzecz na pierwsze dni.",
    illustration: "banner-water",
  },
};

export const Install: Story = {
  args: {
    title: "Dodaj do ekranu głównego",
    children: "Aplikacja działa wtedy bez internetu.",
    illustration: "banner-install",
  },
};

export const Extend: Story = {
  args: {
    title: "Plan na 14 dni?",
    children: "72 godziny to oficjalna podstawa.",
    illustration: "banner-extend",
  },
};

export const LongText: Story = {
  args: {
    title: "Rozszerz plan o kolejne dni",
    children: "Dłuższy plan wymaga więcej wody i jedzenia, a część z nich to nasze rekomendacje.",
  },
};

/** Narrow container, as at a large system font size: the text stacks above the art. */
export const LargeText: Story = {
  args: Extend.args,
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};

export const AsHeading: Story = { args: { titleAs: "h2" } };
