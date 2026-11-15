"use client";

import { useTranslations } from "next-intl";
import { PageShell } from "@/components/ui";

/** A neutral page shown while storage is read, so no screen flashes first. */
export function HeldPage() {
  const t = useTranslations("common");
  return (
    <PageShell>
      <main aria-busy="true" className="flex flex-1 flex-col">
        <p role="status" className="sr-only">
          {t("loading")}
        </p>
      </main>
    </PageShell>
  );
}
