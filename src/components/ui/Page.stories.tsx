import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./Button";
import { PageBody, PageFooter, PageHeader, PageShell, TopBar, Wordmark } from "./Page";
import { Panel } from "./Panel";

const meta = {
  title: "Układ/Page",
  component: PageShell,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { children: null },
} satisfies Meta<typeof PageShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A step of a flow: back link, step count, title, content, main action. */
export const Step: Story = {
  render: () => (
    <div className="flex min-h-dvh flex-col">
      <PageShell>
        <TopBar back={{ href: "/" }} step="Krok 1 z 4" />
        <PageHeader
          eyebrow="Twój dom"
          title="Kto mieszka z Tobą?"
          lead="Policzymy zapasy dla każdej osoby."
        />
        <PageBody>
          <Panel>
            <p className="text-body">Tu są pytania tego kroku.</p>
          </Panel>
        </PageBody>
        <PageFooter>
          <Button>Dalej</Button>
        </PageFooter>
      </PageShell>
    </div>
  ),
};

export const WordmarkOnly: Story = { render: () => <Wordmark /> };
