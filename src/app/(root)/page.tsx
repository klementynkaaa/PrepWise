import { ButtonLink, EmptyState, PageShell } from "@/components/ui";
import { localePath } from "@/i18n/paths";
import messages from "../../../messages/pl.json";
import { ForwardToApp } from "./ForwardToApp";

// "/" is a static page that forwards to "/pl": a server redirect isn't
// possible in a static export. A meta refresh does it without JavaScript, a
// client-side replace does it faster, and the link is the last fallback.
export default function RootPage() {
  const target = localePath("/");
  return (
    <PageShell>
      <meta httpEquiv="refresh" content={`0;url=${target}`} />
      <ForwardToApp href={target} />
      <main className="flex flex-1 flex-col justify-center px-4 py-6">
        <EmptyState
          illustration="empty-kit"
          headingLevel={1}
          title={messages.redirect.title}
          action={<ButtonLink href={target}>{messages.redirect.action}</ButtonLink>}
        >
          {messages.redirect.body}
        </EmptyState>
      </main>
    </PageShell>
  );
}
