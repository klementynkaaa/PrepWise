import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Alert,
  ButtonLink,
  Divider,
  EmptyState,
  Illustration,
  illustrationNames,
  KeyValueRow,
  ListSectionLabel,
  MemberChip,
  Notice,
  Panel,
  PanelList,
  PageBody,
  PageHeader,
  PageShell,
  PlanRow,
  PriorityHeader,
  ProgressBarRow,
  ProgressRing,
  SaveStatus,
  SectionHeader,
  SourcePill,
  StatusPill,
  TabBar,
  TextLink,
  Tip,
  TopBar,
  type TabItem,
} from "@/components/ui";
import {
  ButtonsDemo,
  ChecklistDemo,
  ChipsDemo,
  OptionsDemo,
  SegmentedDemo,
  SheetDemo,
  StepperDemo,
  StepperErrorDemo,
  UndoDemo,
} from "./Demos";

// The design system showcase: every v1 component and state on one page, for
// review against the boards, at large text, with a screen reader, and under
// CI's accessibility scan. Not linked from anywhere and not indexed.
export const metadata: Metadata = {
  title: "System",
  robots: { index: false, follow: false },
};

const tabs: readonly TabItem[] = [
  { href: "/", label: "Start", icon: "home" },
  { href: "/plan", label: "Plan", icon: "plan" },
  { href: "/lista", label: "Lista", icon: "list" },
  { href: "/dane", label: "Dane", icon: "lock" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionHeader title={title} />
      {children}
    </section>
  );
}

export default function SystemPage() {
  return (
    <PageShell>
      <TopBar back={{ href: "/", label: "Start" }} step="Krok 1 z 4" />
      <PageHeader
        eyebrow="PREPWISE"
        title="System"
        lead="Wszystkie elementy aplikacji i ich stany w jednym miejscu."
      />
      <PageBody>
        <Section title="Przyciski">
          <ButtonsDemo />
          <ButtonLink href="/">Otwórz listę</ButtonLink>
          <ButtonLink href="/" variant="secondary" size="small">
            Zobacz plan
          </ButtonLink>
          <TextLink href="/system">Skąd te ilości?</TextLink>
        </Section>

        <Section title="Licznik osób">
          <StepperDemo />
          <StepperErrorDemo />
        </Section>

        <Section title="Opcje">
          <OptionsDemo />
        </Section>

        <Section title="Tak / Nie">
          <SegmentedDemo />
        </Section>

        <Section title="Wiersze planu">
          <PanelList>
            <PriorityHeader tier={1} level={3}>
              Woda i jedzenie
            </PriorityHeader>
            <PlanRow
              first
              name="Woda pitna"
              quantity="27 l"
              formula="3 l × 3 osoby × 3 dni"
              source="official"
            />
            <Divider />
            <PlanRow
              name="Jedzenie bez gotowania"
              quantity="27 porcji"
              formula="3 posiłki × 3 osoby × 3 dni"
              source="official"
            />
            <Divider />
            <PlanRow
              name="Woda dla psa"
              quantity="4,5 l"
              formula="0,5 l × 1 zwierzę × 3 dni · na 10 kg wagi"
              source="prepwise"
            />
          </PanelList>
        </Section>

        <Section title="Lista">
          <ChecklistDemo />
        </Section>

        <Section title="Plakietki">
          <Panel>
            <div className="flex flex-wrap gap-2">
              <SourcePill source="official" />
              <SourcePill source="prepwise" />
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="missing" />
              <StatusPill status="have" />
              <StatusPill status="done" />
            </div>
          </Panel>
        </Section>

        <Section title="Postęp">
          <Panel>
            <div className="flex flex-wrap items-center gap-4">
              <ProgressRing done={0} total={38} />
              <ProgressRing done={3} total={7} />
              <ProgressRing done={12} total={38} />
              <ProgressRing done={38} total={38} />
            </div>
          </Panel>
          <PanelList>
            <ProgressBarRow name="Woda i jedzenie" done={0} total={7} detail="zacznij od wody" />
            <Divider />
            <ProgressBarRow
              name="Światło i łączność"
              done={4}
              total={7}
              detail="brakuje m.in. radia"
            />
            <Divider />
            <ProgressBarRow name="Ciepło" done={3} total={3} />
          </PanelList>
        </Section>

        <Section title="Nagłówki">
          <SectionHeader title="Co dalej" meta="12 z 38 gotowe" level={3} />
          <SectionHeader
            title="Twój plan"
            action={{ href: "/system", label: "Zobacz wszystko" }}
            level={3}
          />
          <PanelList>
            <ListSectionLabel>Do kupienia</ListSectionLabel>
            <PriorityHeader tier={2} level={3}>
              Światło i łączność
            </PriorityHeader>
          </PanelList>
        </Section>

        <Section title="Komunikaty">
          <Notice icon="offline">
            Jesteś offline. Wszystko działa — zmiany zapisują się w telefonie.
          </Notice>
          <Notice>Plan się zmienił: doszło zwierzę, więc dodaliśmy wodę i karmę.</Notice>
          <Tip>Jeszcze 6 rzeczy z priorytetu 1 i Twój dom ma zapas wody i jedzenia na 3 dni.</Tip>
          <Alert title="Nie udało się zapisać">
            Telefon nie pozwolił zapisać danych. Zwolnij trochę miejsca i spróbuj ponownie.
          </Alert>
        </Section>

        <Section title="Zakładki">
          <TabBar items={tabs} currentHref="/plan" />
        </Section>

        <Section title="Stan zapisu">
          <SaveStatus state="saved" />
          <SaveStatus state="offline" />
        </Section>

        <Section title="Filtry">
          <ChipsDemo />
        </Section>

        <Section title="Karta domu">
          <Panel as="section">
            <h3 className="text-heading-sm">Twój dom</h3>
            <div className="flex flex-wrap gap-2">
              <MemberChip>2 dorosłych</MemberChip>
              <MemberChip>1 dziecko</MemberChip>
              <MemberChip>Pies</MemberChip>
            </div>
            <div className="flex flex-col">
              <KeyValueRow label="Na ile dni" value="3 dni" />
              <KeyValueRow label="Sytuacje" value="Brak prądu" />
            </div>
            <TextLink href="/system">Zmień dane domu</TextLink>
          </Panel>
        </Section>

        <Section title="Arkusz">
          <SheetDemo />
        </Section>

        <Section title="Cofnij">
          <UndoDemo />
        </Section>

        <Section title="Stany">
          <Panel>
            <EmptyState
              illustration="empty-kit"
              title="Twoja lista jest pusta"
              action={<ButtonLink href="/">Utwórz plan</ButtonLink>}
            >
              Odpowiedz na kilka pytań o dom, a przygotujemy listę rzeczy do zebrania.
            </EmptyState>
          </Panel>
        </Section>

        <Section title="Ilustracje">
          <div className="grid grid-cols-2 gap-3">
            {illustrationNames.map((name) => (
              <figure
                key={name}
                className="flex flex-col items-center gap-2 rounded-md bg-surface p-3 shadow-panel"
              >
                <Illustration name={name} />
                <figcaption className="text-caption text-ink-muted">{name}</figcaption>
              </figure>
            ))}
          </div>
        </Section>
      </PageBody>
    </PageShell>
  );
}
