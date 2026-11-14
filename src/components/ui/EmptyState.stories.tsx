import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ButtonLink } from "./Button";
import { EmptyState } from "./EmptyState";
import { stateIllustrationNames } from "./Illustration";

const meta = {
  title: "Stany/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  args: {
    illustration: "empty-kit",
    title: "Twoja lista jest pusta",
    children: "Odpowiedz na kilka pytań o dom, a przygotujemy listę rzeczy do zebrania.",
    action: <ButtonLink href="/">Utwórz plan</ButtonLink>,
  },
  argTypes: { illustration: { control: "select", options: stateIllustrationNames } },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyKit: Story = {};

/** The offline fallback page. Its heading is an h1, but it looks the same. */
export const Offline: Story = {
  args: {
    illustration: "offline",
    headingLevel: 1,
    title: "Brak połączenia z internetem",
    children:
      "Ta strona nie jest zapisana na Twoim urządzeniu. Twój plan i lista zakupów działają bez internetu.",
    action: <ButtonLink href="/">Wróć do strony głównej</ButtonLink>,
  },
};

export const StorageError: Story = {
  args: {
    illustration: "storage-error",
    title: "Nie udało się zapisać",
    children: "Zwolnij trochę miejsca w telefonie i spróbuj ponownie.",
    action: undefined,
  },
};

/** Same layout every time: only the art, the words and the optional button change. */
export const AllSideBySide: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <EmptyState
        illustration="empty-shopping"
        title="Nic do kupienia"
        action={<ButtonLink href="/">Zobacz plan</ButtonLink>}
      >
        Masz już wszystko z listy zakupów.
      </EmptyState>
      <EmptyState
        illustration="no-results"
        title="Brak wyników"
        action={<ButtonLink href="/">Pokaż wszystko</ButtonLink>}
      >
        Żadna rzecz nie pasuje do tego filtra.
      </EmptyState>
      <EmptyState
        illustration="kit-complete"
        title="Zapas gotowy"
        action={<ButtonLink href="/">Otwórz listę</ButtonLink>}
      >
        Twój dom ma wszystko z planu na 3 dni.
      </EmptyState>
    </div>
  ),
};
