import { EmptyState, PageShell, TopBar } from "@/components/ui";

export const metadata = { title: "Start" };

// A calm placeholder for the "Zaczynamy" button until S-01 (household profile)
// replaces this file.
export default function StartPage() {
  return (
    <PageShell>
      <TopBar back={{ href: "/" }} />
      <main className="flex flex-1 flex-col justify-center px-4 pb-6">
        <EmptyState illustration="empty-kit" headingLevel={1} title="Tu powstanie plan dla domu">
          Ten krok pojawi się w kolejnej wersji aplikacji.
        </EmptyState>
      </main>
    </PageShell>
  );
}
