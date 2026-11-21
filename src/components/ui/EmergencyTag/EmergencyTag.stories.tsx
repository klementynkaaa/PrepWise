import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EmergencyTags } from "./EmergencyTag";

const meta = {
  title: "Plan/EmergencyTags",
  component: EmergencyTags,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Mała plakietka z plusem, która mówi, jaka sytuacja dodała rzecz do planu (np. „Brak prądu”). " +
          "Stawiamy ją pod podpisem wiersza planu, po lewej, żeby nie myliła się z plakietką źródła po prawej. " +
          "Czytnik ekranu słyszy najpierw ukryty wstęp („dodane na sytuację:”). " +
          "Nie używaj jej na liście zakupów (tam nazwa sytuacji stoi w szarej linii) ani jako przycisku.",
      },
    },
  },
  args: { lead: "dodane na sytuację:", names: ["Brak prądu"] },
  decorators: [
    (Story) => (
      <div className="w-72 rounded-md bg-surface p-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmergencyTags>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneTag: Story = {};

export const TwoTags: Story = { args: { names: ["Brak prądu", "Powódź"] } };

/** A long name wraps inside the pill instead of overflowing. */
export const LongName: Story = {
  args: { names: ["Brak wody w kranie przez kilka dni z rzędu", "Gwałtowna pogoda"] },
};
