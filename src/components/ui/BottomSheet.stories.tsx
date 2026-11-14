import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { KeyValueRow } from "./Panel";
import { SourcePill } from "./Pills";

const meta = {
  title: "Nakładki/BottomSheet",
  component: BottomSheet,
  tags: ["autodocs"],
  args: {
    open: false,
    onClose: fn(),
    title: "Skąd te ilości?",
    children: null,
  },
  // Opened from a trigger, so focus returns to it on close (Escape, scrim, ×).
  render: function Render(args) {
    const [, updateArgs] = useArgs<typeof args>();
    const close = () => {
      args.onClose();
      updateArgs({ open: false });
    };
    return (
      <>
        <Button variant="secondary" size="small" onClick={() => updateArgs({ open: true })}>
          Skąd te ilości?
        </Button>
        <BottomSheet {...args} onClose={close}>
          <p className="text-body">
            Liczymy: ilość na osobę na dzień × liczba osób × liczba dni. Wodę liczymy po 3 litry na
            osobę dziennie.
          </p>
          <div className="flex flex-col">
            <KeyValueRow label="Woda na osobę i dzień" value="3 l" />
            <KeyValueRow label="Osoby" value="3" />
            <KeyValueRow label="Dni" value="3" />
          </div>
          <SourcePill source="official" />
          <Button onClick={close}>Rozumiem</Button>
        </BottomSheet>
      </>
    );
  },
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = { args: { open: true } };
