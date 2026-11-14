import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Button, ButtonLink } from "./Button";

const meta = {
  title: "Akcje/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Dalej", onClick: fn() },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["primary", "secondary", "neutral", "destructive"],
    },
    size: { control: "inline-radio", options: ["full", "small"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: "secondary", children: "Zmień dane domu" } };

/** "Anuluj" next to a destructive action. */
export const Neutral: Story = { args: { variant: "neutral", size: "small", children: "Anuluj" } };

/** Only inside the confirmation of an irreversible action. */
export const Destructive: Story = {
  args: { variant: "destructive", size: "small", children: "Usuń dane" },
};

/** Unavailable: the reason is shown and read as the button's description. */
export const DisabledWithReason: Story = {
  args: { disabledReason: "Dodaj co najmniej jedną osobę, żeby przejść dalej." },
};

export const SmallInCard: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      <Button {...args} size="small">
        Otwórz
      </Button>
      <Button {...args} size="small" variant="secondary">
        Edytuj
      </Button>
      <Button {...args} size="small" variant="neutral">
        Anuluj
      </Button>
      <Button {...args} size="small" variant="destructive">
        Usuń dane
      </Button>
    </div>
  ),
};

/** Navigation that looks like a button. */
export const AsLink: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <ButtonLink href="/">Otwórz listę</ButtonLink>
      <ButtonLink href="/" variant="secondary" size="small">
        Zobacz plan
      </ButtonLink>
    </div>
  ),
};
