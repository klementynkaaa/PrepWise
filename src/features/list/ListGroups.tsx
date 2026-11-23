"use client";

import type { Ref } from "react";
import { ChecklistRow, PanelList, PriorityHeader } from "@/components/ui";
import { formatAmount, formatCaption } from "@/features/plan/format";
import type { RowContext } from "@/features/plan/PlanTiers";
import type { ListGroup, ListRow } from "@/lib/list";

/** A stable key per group: "tier-1" … "tier-3", "pets", "backpack". */
export function groupKey(group: ListGroup): string {
  switch (group.kind) {
    case "tier":
      return `tier-${group.tier}`;
    case "pets":
      return "pets";
    case "backpack":
      return "backpack";
  }
}

/** The heading of a group. A new kind of group fails to compile here until it has one. */
function groupTitle(t: RowContext["t"], group: ListGroup): string {
  switch (group.kind) {
    case "tier":
      return t(`plan.tiers.${group.tier}`);
    case "pets":
      return t("plan.sections.pets", { kind: group.petKind });
    case "backpack":
      return t("list.sections.backpack");
  }
}

/** The id of a group's rows, which its disclosure header controls. */
export const groupRowsId = (key: string) => `list-${key}`;

/** Finds a row's checkbox again after a re-sort. Item ids are kebab-case slugs. */
export const rowCheckbox = (root: ParentNode, itemId: string) =>
  root.querySelector<HTMLInputElement>(`[data-list-item="${itemId}"] input[type="checkbox"]`);

type ListGroupPanelProps = {
  group: ListGroup;
  ctx: RowContext;
  /**
   * Only for a finished group: its header becomes a disclosure button and the
   * rows show only while `expanded`.
   */
  collapse?: { expanded: boolean; onToggle: () => void };
  /** The disclosure button, so the screen can move focus to it after folding. */
  headerRef?: Ref<HTMLButtonElement>;
  onTick: (row: ListRow, checked: boolean) => void;
};

/**
 * One group of the list: priority header with "x z y", then its rows,
 * not-done first. Rows are keyed by item id, so a ticked row's node moves
 * to the bottom instead of being rebuilt.
 */
export function ListGroupPanel({ group, ctx, collapse, headerRef, onTick }: ListGroupPanelProps) {
  const { t } = ctx;
  const key = groupKey(group);
  const rowsId = groupRowsId(key);
  const meta = t("progress.count", { done: group.done, total: group.total });
  const common = { ref: headerRef, meta, collapse: collapse && { ...collapse, controls: rowsId } };
  const header =
    group.kind === "tier" ? (
      <PriorityHeader
        {...common}
        tier={group.tier}
        tierLabel={t("plan.tierLabel", { tier: group.tier })}
      >
        {groupTitle(t, group)}
      </PriorityHeader>
    ) : (
      <PriorityHeader {...common}>{groupTitle(t, group)}</PriorityHeader>
    );

  return (
    <section>
      <PanelList>
        {header}
        <ul
          id={rowsId}
          hidden={collapse !== undefined && !collapse.expanded}
          className="flex flex-col gap-2"
        >
          {group.rows.map((row) => (
            <li key={row.itemId} data-list-item={row.itemId}>
              <ListRowItem row={row} ctx={ctx} onTick={onTick} />
            </li>
          ))}
        </ul>
      </PanelList>
    </section>
  );
}

function ListRowItem({
  row,
  ctx: { t, args, list },
  onTick,
}: {
  row: ListRow;
  ctx: RowContext;
  onTick: (row: ListRow, checked: boolean) => void;
}) {
  // The group already names the priority, so a child item's "priorytet 1" is left out.
  const detail = formatCaption(t, { ...row.detailSource, tier: undefined }, args, list, {
    withEmergencies: true,
  });
  return (
    <ChecklistRow
      name={t(`plan.items.${row.itemId}.listName`, args)}
      detail={detail || undefined}
      quantity={formatAmount(t, row.unit, row.quantity)}
      checked={row.done}
      onChange={(checked) => onTick(row, checked)}
      first={row.first ? { label: t("plan.first") } : undefined}
    />
  );
}
