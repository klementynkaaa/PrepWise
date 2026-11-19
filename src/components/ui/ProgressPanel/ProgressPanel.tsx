import type { ReactNode } from "react";
import { LinkPanel, Panel } from "../Panel";
import { ProgressBar, ProgressRing } from "../Progress";

type ProgressPanelProps = {
  /** The count in words, e.g. "Gotowe 7 z 22" (`progress.done`). */
  count: ReactNode;
  /** What is left, e.g. "Zostało 15 rzeczy do odhaczenia." (`list.progress.left`). */
  left: ReactNode;
  done: number;
  total: number;
  /**
   * What a screen reader hears for the bar, e.g. "Postęp listy zakupów". With
   * `href` the bar is hidden from screen readers: the link is named by its words.
   */
  barLabel: string;
  /** A heading above the count, e.g. "Gotowość na 72 godziny" on Start. */
  title?: ReactNode;
  /** Makes the whole panel one link (e.g. to the list from Start). */
  href?: string;
  /**
   * Shows a large ring with this short count inside ("4/20",
   * `progress.fraction`) beside the words, instead of the bar. Used at the
   * top of Start.
   */
  ring?: { fraction: string };
};

/**
 * One progress bar for a whole list: the count, the bar and what is left, in
 * a panel. Shared by the list header and Start; with `href` the panel is a
 * link, so keep its words short.
 */
export function ProgressPanel({
  count,
  left,
  done,
  total,
  barLabel,
  title,
  href,
  ring,
}: ProgressPanelProps) {
  if (ring) {
    const ringBody = (
      <>
        {title && <h2 className="text-heading-sm">{title}</h2>}
        <div className="flex items-center gap-4">
          <ProgressRing
            done={done}
            total={total}
            label={barLabel}
            fraction={ring.fraction}
            size="lg"
            decorative={href !== undefined}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-body-strong">{count}</p>
            <p className="text-body-sm text-ink-muted">{left}</p>
          </div>
        </div>
      </>
    );
    return href ? <LinkPanel href={href}>{ringBody}</LinkPanel> : <Panel>{ringBody}</Panel>;
  }

  const bar = <ProgressBar done={done} total={total} label={barLabel} />;
  const body = (
    <>
      {title && <h2 className="text-heading-sm">{title}</h2>}
      <div className="flex flex-col gap-2">
        <p className="text-body-strong">{count}</p>
        {href ? <span aria-hidden="true">{bar}</span> : bar}
        <p className="text-body-sm text-ink-muted">{left}</p>
      </div>
    </>
  );

  return href ? <LinkPanel href={href}>{body}</LinkPanel> : <Panel>{body}</Panel>;
}
