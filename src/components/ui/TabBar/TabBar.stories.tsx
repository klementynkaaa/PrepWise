import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppHeader } from "../AppHeader";
import { Panel } from "../Panel";
import { TabBar } from "./TabBar";

const meta = {
  title: "Nawigacja/TabBar",
  component: TabBar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Główna nawigacja z widocznymi podpisami. Przykleja się do dołu okna, więc na wysokim lub szerokim oknie nie unosi się za krótką treścią. " +
          "Użyj jej na głównych ekranach aplikacji. Nie używaj w krokach przepływu ani z więcej niż pięcioma pozycjami.",
      },
    },
  },
  args: {
    label: "Główna nawigacja",
    items: [
      { href: "/", label: "Start", icon: "home" },
      { href: "/plan", label: "Plan", icon: "plan" },
      { href: "/lista", label: "Lista", icon: "list" },
      { href: "/dane", label: "Dane", icon: "lock" },
    ],
    currentHref: "/plan",
  },
  argTypes: {
    currentHref: { control: "inline-radio", options: ["/", "/plan", "/lista", "/dane"] },
  },
} satisfies Meta<typeof TabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The current tab is announced as the current page. */
export const PlanCurrent: Story = {};
export const StartCurrent: Story = { args: { currentHref: "/" } };

function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        saveState="saved"
        saveLabels={{ saved: "Zapisane w telefonie", offline: "Offline · wszystko działa" }}
      />
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-3 px-4 py-3">
        <Panel>
          <p className="text-body">Krótka treść ekranu.</p>
        </Panel>
        <Panel>
          <p className="text-body">Pasek kart zostaje przy dolnej krawędzi okna.</p>
        </Panel>
      </main>
      <TabBar
        label="Główna nawigacja"
        items={[
          { href: "/", label: "Start", icon: "home" },
          { href: "/plan", label: "Plan", icon: "plan" },
          { href: "/lista", label: "Lista", icon: "list" },
          { href: "/dane", label: "Dane", icon: "lock" },
        ]}
        currentHref="/plan"
      />
    </div>
  );
}

/** Short content: the bar stays at the bottom of the tablet window. */
export const WUkladzie: Story = {
  name: "W układzie",
  globals: { viewport: { value: "tablet", isRotated: false } },
  render: () => <Layout />,
};

/** On a wide window the bar is full width, the content a centred 32 rem column. */
export const WUkladzieDesktop: Story = {
  name: "W układzie (komputer)",
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => <Layout />,
};
