"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  Divider,
  EmergencyTags,
  ListSectionLabel,
  PanelList,
  PlanRow,
  PriorityHeader,
  TextLink,
} from "@/components/ui";
import type { PlanRowData, PlanSection, PlanTier } from "@/lib/plan";
import {
  countItems,
  emergencyNames,
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
        <PriorityHeader
          tier={tier.tier}
          tierLabel={t("tierLabel", { tier: tier.tier })}
          meta={t("itemCount", { count: tierItemCount(tier) })}
        >
          {t(`tiers.${tier.tier}`)}
        </PriorityHeader>
      }
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
        <PriorityHeader
          meta={t("itemCount", { count: countItems(section.rows) })}
          below={
            // The backpack is tagged once, here, instead of on each row.
            section.id === "backpack" ? (
              <EmergencyTags
                onTint
                lead={ctx.t("plan.emergencies.ui.lead")}
                names={emergencyNames(ctx.t, section.emergencies)}
              />
            ) : undefined
          }
        >
          {t(`sections.${section.id}`, { kind })}
        </PriorityHeader>
      }
    >
      <PlanRows rows={section.rows} ctx={ctx} tagged={section.id !== "backpack"} />
    </PanelSection>
  );
}

function PanelSection({
  id,
  heading,
  children,
}: {
  id: string;
  heading: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4">
      <PanelList>
        {heading}
        {children}
      </PanelList>
    </section>
  );
}

/** `tagged` is false in the backpack, whose header carries the emergency tags once. */
function PlanRows({
  rows,
  ctx,
  tagged = true,
}: {
  rows: readonly PlanRowData[];
  ctx: RowContext;
  tagged?: boolean;
}) {
  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <li key={row.pointer ? `${row.itemId}-pointer` : row.itemId}>
          <PlanRowItem row={row} ctx={ctx} tagged={tagged} />
        </li>
      ))}
    </ul>
  );
}

function PlanRowItem({
  row,
  ctx: { t, args, list },
  tagged,
}: {
  row: PlanRowData;
  ctx: RowContext;
  tagged: boolean;
}) {
  const formula = row.pointer ? (
    // Leads to the item in its own section further down; the row itself has no link.
    <TextLink href={`#${sectionAnchor(row.pointer)}`} size="caption">
      {t(`plan.formula.pointer.${row.pointer}`)}
    </TextLink>
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
      tags={
        tagged && row.emergencies ? (
          <EmergencyTags
            lead={t("plan.emergencies.ui.lead")}
            names={emergencyNames(t, row.emergencies)}
          />
        ) : undefined
      }
    />
  );
}
