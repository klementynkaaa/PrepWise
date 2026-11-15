import { ButtonLink, EmptyState, PageShell } from "@/components/ui";
import { localePath } from "@/i18n/paths";
import messages from "../../../../messages/pl.json";

export const metadata = { title: messages.offline.metaTitle };

// Shown by the service worker for pages that aren't saved on the device.
// Every regular PREPWISE page is saved, so this should be rare. Always Polish,
// read straight from the dictionary: no locale is known when it is shown.
export default function OfflinePage() {
  return (
    <PageShell>
      <main className="flex flex-1 flex-col justify-center px-4 py-6">
        <EmptyState
          illustration="offline"
          headingLevel={1}
          title={messages.offline.title}
          action={<ButtonLink href={localePath("/")}>{messages.common.backToHome}</ButtonLink>}
        >
          {messages.offline.body}
        </EmptyState>
      </main>
    </PageShell>
  );
}
