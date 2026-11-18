"use client";

import { useTranslations } from "next-intl";
import { BottomSheet, Button, SourcePill, type Source } from "@/components/ui";

const SOURCES: readonly Source[] = ["official", "prepwise"];

/** "Skąd te ilości?": how a quantity is counted and what each source pill means. */
export function SourcesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("plan");
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("sources.title")}
      closeLabel={t("sources.close")}
    >
      <p className="text-body">{t("sources.lead")}</p>
      <dl className="flex flex-col gap-2.5">
        {SOURCES.map((source) => (
          <div key={source} className="flex items-baseline gap-2.5">
            <dt>
              <SourcePill
                source={source}
                labels={{
                  short: t(`source.${source}.short`),
                  spoken: t(`source.${source}.spoken`),
                }}
              />
            </dt>
            <dd className="text-body-sm">{t(`sources.${source}`)}</dd>
          </div>
        ))}
      </dl>
      <Button onClick={onClose}>{t("sources.close")}</Button>
    </BottomSheet>
  );
}
