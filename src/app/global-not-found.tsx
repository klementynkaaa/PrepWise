import type { Metadata } from "next";
import { ButtonLink, EmptyState, PageShell } from "@/components/ui";
import { localePath } from "@/i18n/paths";
import messages from "../../messages/pl.json";
import { RootShell, rootMetadata } from "./root-shell";

// Bypasses every layout, so it builds its own shell (and root-shell imports
// the styles). Polish, read straight from the dictionary.
export const metadata: Metadata = {
  ...rootMetadata(messages.meta),
  title: messages.notFound.metaTitle,
};

export default function GlobalNotFound() {
  return (
    <RootShell lang="pl">
      <PageShell>
        <main className="flex flex-1 flex-col justify-center px-4 py-6">
          <EmptyState
            illustration="empty-kit"
            headingLevel={1}
            title={messages.notFound.title}
            action={<ButtonLink href={localePath("/")}>{messages.common.backToHome}</ButtonLink>}
          >
            {messages.notFound.body}
          </EmptyState>
        </main>
      </PageShell>
    </RootShell>
  );
}
