import Link from "next/link";
import type { ReactNode } from "react";
import { Illustration, type IllustrationName } from "../Illustration";
import { Icon } from "../Icon";
import { ProgressBar, ProgressRing } from "../Progress";

type ReadinessPanelProps = {
  done: number;
  total: number;
  /** The percentage shown inside the ring, e.g. "33%" (`progress.percent`). */
  percent: string;
  /** The count in words, bold beside the ring, e.g. "Gotowe 15 z 45" (`progress.done`). */
  count: ReactNode;
  /** One short, muted sentence under the count. */
  note: ReactNode;
  /** Optional `ReadinessRow`s under a hairline: one per part of the list. */
  children?: ReactNode;
};

/**
 * "Gotowość na 72 godziny": a white panel with a large ring (percentage inside),
 * the count in words and one sentence. With `ReadinessRow` children it adds a
 * row per part (home supplies, backpack), each its own link. The words carry the
 * meaning, so the ring is hidden from screen readers. The title sits above the
 * panel, in a `SectionHeader`.
 */
export function ReadinessPanel({
  done,
  total,
  percent,
  count,
  note,
  children,
}: ReadinessPanelProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-panel">
      <div className="flex items-center gap-4">
        <ProgressRing done={done} total={total} label="" fraction={percent} size="xl" decorative />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-heading-sm">{count}</p>
          <p className="text-body-sm text-ink-muted">{note}</p>
        </div>
      </div>
      {children ? (
        <>
          <hr className="h-px border-0 bg-line" />
          <div className="flex flex-col">{children}</div>
        </>
      ) : null}
    </div>
  );
}

type ReadinessRowProps = {
  href: string;
  /** Item art (never invented): food or water for home supplies, the backpack. */
  illustration: IllustrationName;
  name: ReactNode;
  /** The visible count, e.g. "12 z 35" (`progress.count`). */
  count: ReactNode;
  done: number;
  total: number;
};

/**
 * One part of the list as a tappable row: a 52px picture, the name with its
 * count on one line, a bar and a chevron. The link is named by its name and
 * count; the picture and the bar are decorative.
 */
export function ReadinessRow({ href, illustration, name, count, done, total }: ReadinessRowProps) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 rounded-md py-1 active:bg-accent-tint"
    >
      <Illustration name={illustration} thumb />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <span className="min-w-0 text-body-strong wrap-break-word">{name}</span>{" "}
          <span className="text-caption font-semibold whitespace-nowrap">{count}</span>
        </span>
        <span aria-hidden="true">
          <ProgressBar done={done} total={total} label="" />
        </span>
      </span>
      <span className="text-ink-muted">
        <Icon name="forward" />
      </span>
    </Link>
  );
}
