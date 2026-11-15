"use client";

import { useTranslations } from "next-intl";
import { Alert, Button, EmptyState, PageShell } from "@/components/ui";

type SaveErrorProps = {
  onRetry: () => void;
  /** Back to the form with every answer still in place. */
  onBack: () => void;
};

/** Shown when a step could not be saved. The person stays on that step. */
export function SaveError({ onRetry, onBack }: SaveErrorProps) {
  const t = useTranslations("saveError");
  return (
    <PageShell>
      <main className="flex flex-1 flex-col justify-center px-4 py-6">
        <EmptyState
          illustration="storage-error"
          headingLevel={1}
          title={t("title")}
          action={
            <div className="flex flex-col gap-3">
              <Alert title={t("reasonTitle")}>{t("reason")}</Alert>
              <Button onClick={onRetry}>{t("retry")}</Button>
              <Button variant="secondary" onClick={onBack}>
                {t("back")}
              </Button>
            </div>
          }
        >
          {t("note")}
        </EmptyState>
      </main>
    </PageShell>
  );
}
