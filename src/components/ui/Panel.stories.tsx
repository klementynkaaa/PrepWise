import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Divider, KeyValueRow, ListSectionLabel, Panel, PanelList } from "./Panel";
import { MemberChip } from "./Pills";
import { TextLink } from "./TextLink";

const meta = {
  title: "Układ/Panel",
  component: Panel,
  tags: ["autodocs"],
  args: { children: <p className="text-body">Biały panel na tle mgły.</p> },
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ListWithRows: Story = {
  render: () => (
    <PanelList>
      <ListSectionLabel>Podsumowanie</ListSectionLabel>
      <KeyValueRow label="Na ile dni" value="3 dni" />
      <Divider />
      <KeyValueRow label="Sytuacje" value="Brak prądu" />
    </PanelList>
  ),
};

/** The household card. */
export const HouseholdCard: Story = {
  render: () => (
    <Panel as="section">
      <h2 className="text-heading-sm">Twój dom</h2>
      <div className="flex flex-wrap gap-2">
        <MemberChip>2 dorosłych</MemberChip>
        <MemberChip>1 dziecko</MemberChip>
        <MemberChip>Pies</MemberChip>
      </div>
      <div className="flex flex-col">
        <KeyValueRow label="Na ile dni" value="3 dni" />
        <KeyValueRow label="Sytuacje" value="Brak prądu" />
      </div>
      <TextLink href="/">Zmień dane domu</TextLink>
    </Panel>
  ),
};
