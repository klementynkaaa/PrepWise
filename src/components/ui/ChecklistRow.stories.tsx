import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { ChecklistRow } from "./ChecklistRow";
import { Divider, PanelList } from "./Panel";
import { UndoBar } from "./UndoBar";

const meta = {
  title: "Lista/ChecklistRow",
  component: ChecklistRow,
  tags: ["autodocs"],
  args: {
    name: "Kup wodę pitną",
    detail: "27 l · np. 6 butelek po 5 l",
    checked: false,
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <PanelList>
        <Story />
      </PanelList>
    ),
  ],
  render: function Render(args) {
    const [, updateArgs] = useArgs<typeof args>();
    return (
      <ChecklistRow
        {...args}
        onChange={(checked) => {
          args.onChange(checked);
          updateArgs({ checked });
        }}
      />
    );
  },
} satisfies Meta<typeof ChecklistRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ToDo: Story = {};

/** Done: sunken row, check mark and "Mam" — never struck through. */
export const Done: Story = { args: { checked: true } };

const items = [
  { id: "water", name: "Kup wodę pitną", detail: "27 l · np. 6 butelek po 5 l" },
  { id: "food", name: "Konserwy i suchy prowiant", detail: "na 3 dni dla 3 osób" },
  { id: "radio", name: "Radio na baterie", detail: "1 szt." },
] as const;

type ItemId = (typeof items)[number]["id"];

/** A list with undo after unticking, as on the Lista screen. */
export const ListWithUndo: Story = {
  decorators: [(Story) => <Story />],
  render: function Render() {
    const [done, setDone] = useState<ReadonlySet<ItemId>>(new Set(["radio"]));
    const [undo, setUndo] = useState<ItemId | null>(null);

    function toggle(id: ItemId, checked: boolean) {
      setDone((previous) => {
        const next = new Set(previous);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      });
      setUndo(checked ? null : id);
    }

    const undoItem = items.find((item) => item.id === undo);

    return (
      <div className="flex flex-col gap-3">
        <PanelList>
          {items.map((item, index) => (
            <div key={item.id}>
              {index > 0 && <Divider />}
              <ChecklistRow
                name={item.name}
                detail={item.detail}
                checked={done.has(item.id)}
                onChange={(checked) => toggle(item.id, checked)}
              />
            </div>
          ))}
        </PanelList>
        {undoItem && (
          <UndoBar
            message={`Odznaczono: ${undoItem.name}`}
            onUndo={() => toggle(undoItem.id, true)}
          />
        )}
      </div>
    );
  },
};
