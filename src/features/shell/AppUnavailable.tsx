"use client";

import { Button, EmptyState } from "@/components/ui";
import type { AppLocale } from "@/i18n/routing";
import { AppFrame } from "./AppFrame";

/**
 * The app screens' (Start, Plan, list) storage error: storage can't be opened, so
 * the screen offers a reload. Each screen passes its own words; the body
 * line is optional (Plan's and the list's errors have only a title and the button).
 */
export function AppUnavailable({
  locale,
  title,
  body,
  retry,
}: {
  locale: AppLocale;
  title: string;
  body?: string;
  retry: string;
}) {
  return (
    <AppFrame locale={locale} connection={false}>
      <main className="flex flex-1 flex-col justify-center px-4 py-6">
        <EmptyState
          illustration="storage-error"
          headingLevel={1}
          title={title}
          action={<Button onClick={() => window.location.reload()}>{retry}</Button>}
        >
          {body}
        </EmptyState>
      </main>
    </AppFrame>
  );
}
