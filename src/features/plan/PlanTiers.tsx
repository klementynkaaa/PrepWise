"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Divider, ListSectionLabel, PanelList, PlanRow, PriorityHeader } from "@/components/ui";
import type { PlanRowData, PlanSection, PlanTier } from "@/lib/plan";
import {
  countItems,
  formatAmount,
  formatCaption,
  tierItemCount,
  type ItemArgs,
  type Translator,
} from "./format";

/** What every row needs to format itself, shared by the whole plan. */
export type RowContext = { t: Translator; args: ItemArgs; list: Intl.ListFormat };

/** Section ids are anchors: Start's tiles link to them (`/plan#tier-1`). */
export const tierAnchor = (tier: number) => `tier-${tier}`;
export const sectionAnchor = (id: PlanSection["id"]) => `section-${id}`;

/** One priority panel: the numbered heading, then each category's rows. */
export function TierPanel({ tier, ctx }: { tier: PlanTier; ctx: RowContext }) {
  const t = useTranslations("plan");
  return (
    <PanelSection
      id={tierAnchor(tier.tier)}
      heading={
        <PriorityHeader tier={tier.tier} tierLabel={t("tierLabel", { tier: tier.tier })}>
          {t(`tiers.${tier.tier}`)}
        </PriorityHeader>
      }
      count={t("itemCount", { count: tierItemCount(tier) })}
    >
      {tier.categories.map((category, index) => (
        <div key={category.id}>
          {index > 0 && <Divider />}
          <ListSectionLabel>{t(`categories.${category.id}`)}</ListSectionLabel>
          <PlanRows rows={category.rows} ctx={ctx} />
        </div>
      ))}
    </PanelSection>
  );
}

/** A member section after the tiers ("Dla małego dziecka", "Dla psa"): no number. */
export function SectionPanel({ section, ctx }: { section: PlanSection; ctx: RowContext }) {
  const t = useTranslations("plan");
  const kind = section.id === "pets" ? section.petKind : "dog";
  return (
    <PanelSection
      id={sectionAnchor(section.id)}
      heading={
        <h2 className="px-2.5 py-2 text-control font-bold">
          {t(`sections.${section.id}`, { kind })}
        </h2>
      }
      count={t("itemCount", { count: countItems(section.rows) })}
    >
      <PlanRows rows={section.rows} ctx={ctx} />
    </PanelSection>
  );
}

function PanelSection({
  id,
  heading,
  count,
  children,
}: {
  id: string;
  heading: ReactNode;
  count: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4">
      <PanelList>
        <div className="flex items-center justify-between gap-2 pr-2.5">
          {heading}
          <span className="text-caption font-semibold whitespace-nowrap text-ink-muted">
            {count}
          </span>
        </div>
        {children}
      </PanelList>
    </section>
  );
}

function PlanRows({ rows, ctx }: { rows: readonly PlanRowData[]; ctx: RowContext }) {
  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <li key={row.pointer ? `${row.itemId}-pointer` : row.itemId}>
          <PlanRowItem row={row} ctx={ctx} />
        </li>
      ))}
    </ul>
  );
}

function PlanRowItem({ row, ctx: { t, args, list } }: { row: PlanRowData; ctx: RowContext }) {
  const formula = row.pointer ? (
    // Leads to the item in its own section further down; the row itself has no link.
    <a
      href={`#${sectionAnchor(row.pointer)}`}
      className="inline-flex min-h-6 items-center font-semibold text-accent"
    >
      {t(`plan.formula.pointer.${row.pointer}`)}
    </a>
  ) : (
    formatCaption(t, row, args, list)
  );
  return (
    <PlanRow
      name={t(`plan.items.${row.itemId}.name`, args)}
      formula={formula}
      quantity={formatAmount(t, row.unit, row.quantity)}
      source={row.source}
      sourceLabels={{
        short: t(`plan.source.${row.source}.short`),
        spoken: t(`plan.source.${row.source}.spoken`),
      }}
      firstLabel={row.first ? t("plan.first") : undefined}
    />
  );
}
