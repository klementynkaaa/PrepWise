import { ButtonLink, EmptyState, PageShell } from "@/components/ui";

export const metadata = { title: "Brak połączenia" };

// Shown by the service worker for pages that aren't saved on the device.
// Every regular PREPWISE page is saved, so this should be rare.
export default function OfflinePage() {
  return (
    <PageShell>
      <main className="flex flex-1 flex-col justify-center px-4 py-6">
        <EmptyState
          illustration="offline"
          headingLevel={1}
          title="Brak połączenia z internetem"
          action={<ButtonLink href="/">Wróć do strony głównej</ButtonLink>}
        >
          Ta strona nie jest zapisana na Twoim urządzeniu. Twój plan i lista zakupów działają bez
          internetu.
        </EmptyState>
      </main>
    </PageShell>
  );
}
