import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BackLink, TextButton, TextLink } from "./TextLink";

const meta = {
  title: "Akcje/TextLink",
  component: TextLink,
  tags: ["autodocs"],
  args: { href: "/", children: "Skąd te ilości?" },
  parameters: {
    docs: {
      description: {
        component:
          '`TextLink` prowadzi do innego miejsca: osobno (`size="body"`, pole dotyku 44 px) albo w linii podpisu, np. we wzorze w wierszu planu (`size="caption"`, cel 24 px; działa też z kotwicą `#sekcja`). ' +
          "`TextButton` wygląda tak samo, ale działa na tym ekranie, np. otwiera arkusz. " +
          "Nie używaj ich do głównej akcji ekranu (do tego `Button`) ani do powrotu (do tego `BackLink`).",
      },
    },
  },
} satisfies Meta<typeof TextLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongText: Story = {
  args: { children: "Zobacz, skąd biorą się ilości wody i jedzenia w tym planie" },
};

/** Inside a caption line, e.g. the formula of a plan row that points to another section. */
export const Caption: Story = {
  render: () => (
    <p className="text-caption text-ink-muted">
      <TextLink href="#section-smallChild" size="caption">
        w sekcji „Dla małego dziecka” niżej
      </TextLink>
    </p>
  ),
};

/** Looks like a link, opens something on this screen (here: a sheet). */
export const Button: Story = {
  render: () => (
    <TextButton aria-haspopup="dialog" onClick={() => {}}>
      Skąd te ilości?
    </TextButton>
  ),
};

export const Back: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <BackLink href="/">Wstecz</BackLink>
      <BackLink href="/">Start</BackLink>
    </div>
  ),
};
