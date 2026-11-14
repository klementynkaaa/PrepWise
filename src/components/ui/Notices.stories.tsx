import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Alert, Notice, Tip } from "./Notices";

const meta = {
  title: "Komunikaty/Notice",
  component: Notice,
  tags: ["autodocs"],
  args: { children: "Plan się zmienił: doszło zwierzę, więc dodaliśmy wodę i karmę." },
  argTypes: { icon: { control: "inline-radio", options: ["info", "offline"] } },
} satisfies Meta<typeof Notice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Offline: Story = {
  args: {
    icon: "offline",
    children: "Jesteś offline. Wszystko działa — zmiany zapisują się w telefonie.",
  },
};

export const Hint: Story = {
  render: () => (
    <Tip>Jeszcze 6 rzeczy z priorytetu 1 i Twój dom ma zapas wody i jedzenia na 3 dni.</Tip>
  ),
};

/** A blocking failure. The only red panel. */
export const Failure: Story = {
  render: () => (
    <Alert title="Nie udało się zapisać">
      Telefon nie pozwolił zapisać danych. Zwolnij trochę miejsca i spróbuj ponownie.
    </Alert>
  ),
};
