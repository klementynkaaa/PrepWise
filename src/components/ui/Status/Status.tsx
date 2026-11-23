import type { ReactNode, Ref } from "react";
import { cn } from "../_shared/cn";
import { Icon } from "../Icon";

type PriorityHeaderProps = {
  children: ReactNode;
  /** A count on the right, e.g. "4 rzeczy" or, for a finished group, "5 z 5". */
  meta?: ReactNode;
  level?: 2 | 3;
  /**
   * A finished group that folds: the heading wraps a disclosure button with
   * a check, the count and a chevron. `controls` is the id of the group's rows.
   */
  collapse?: { expanded: boolean; onToggle: () => void; controls: string };
  /** Extra content inside the band under the name, e.g. the backpack's emergency tags. */
  below?: ReactNode;
  /** The disclosure button, so a screen can move focus to it after folding. */
  ref?: Ref<HTMLButtonElement>;
} & (
  | {
      tier: number;
      /** Spoken in full before the name, e.g. "Priorytet 2". Not shown. */
      tierLabel: string;
    }
  /** A panel heading with no priority (a member section): no number. */
  | { tier?: undefined; tierLabel?: undefined }
);

const metaText = "text-caption font-semibold whitespace-nowrap text-ink-muted";
/** A finished group's "✓ x z y": accent, so done reads at a glance. */
const doneMetaText = "text-caption font-semibold whitespace-nowrap text-accent";

/**
 * Heading of a plan or list panel: the priority number in a circle (when
 * there is one), the name, and an optional count on the right. With `below` (content under
 * the name) the header sits on a tinted band. With
 * `collapse` the whole header is a disclosure button inside the heading, so
 * the heading level still works for navigation.
 */
export function PriorityHeader({
  tier,
  tierLabel,
  meta,
  children,
  level = 2,
  collapse,
  below,
  ref,
}: PriorityHeaderProps) {
  const Heading = level === 2 ? "h2" : "h3";
  const title = (
    <>
      {tier !== undefined && (
        <>
          <PriorityBadge tier={tier} />
          <span className="sr-only">{tierLabel}: </span>
        </>
      )}
      {children}
    </>
  );

  if (collapse) {
    return (
      <Heading className="text-control font-bold">
        <button
          ref={ref}
          type="button"
          aria-expanded={collapse.expanded}
          aria-controls={collapse.controls}
          onClick={collapse.onToggle}
          className="flex min-h-touch w-full items-center gap-2 rounded-md px-2.5 py-2 text-left active:bg-surface-sunken"
        >
          {title}{" "}
          <span className={cn("ml-auto inline-flex items-center gap-1 pl-2", doneMetaText)}>
            <Icon name="check" />
            {meta}
          </span>
          <span
            className={cn(
              "motion-safe:transition-transform",
              // The "back" chevron turned: points right while folded, down when open.
              collapse.expanded ? "-rotate-90" : "rotate-180",
            )}
          >
            <Icon name="back" />
          </span>
        </button>
      </Heading>
    );
  }

  if (!below) {
    const heading = (
      <Heading className="flex items-center gap-2 px-2.5 py-2 text-control font-bold">
        {title}
      </Heading>
    );
    if (meta === undefined) return heading;
    return (
      <div className="flex items-center justify-between gap-2 pr-2.5">
        {heading}
        <span className={metaText}>{meta}</span>
      </div>
    );
  }

  // `below` (e.g. the emergency tags of the backpack) sits inside a tinted band under the name.
  return (
    <div className="flex flex-col gap-1 rounded-md bg-notice-bg pb-2">
      <div className="flex items-center justify-between gap-2 pr-2.5">
        <Heading className="flex items-center gap-2 px-2.5 pt-2 text-control font-bold">
          {title}
        </Heading>
        {meta !== undefined && <span className={metaText}>{meta}</span>}
      </div>
      <div className="px-2.5">{below}</div>
    </div>
  );
}

/**
 * The priority number in a circle, as in `PriorityHeader`. Decorative: the
 * caller says the priority in words (e.g. a visually hidden "Priorytet 1:").
 */
export function PriorityBadge({ tier }: { tier: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-caption font-bold text-on-accent"
    >
      {tier}
    </span>
  );
}

export type SaveState = "saved" | "offline";

const saveDots: Record<SaveState, string> = {
  saved: "bg-accent",
  offline: "bg-control-border",
};

/** The shared pill: a dot and a short text. The role is the caller's choice. */
function Chip({ dot, role, children }: { dot: string; role?: "status"; children: ReactNode }) {
  return (
    <span
      role={role}
      className="inline-flex min-h-chip items-center gap-2 self-start rounded-full bg-surface px-3 text-caption font-semibold whitespace-nowrap inset-ring inset-ring-line"
    >
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", dot)} />
      {children}
    </span>
  );
}

/**
 * Where the data is. Never "synchronizacja": nothing leaves the phone.
 * Display only; the screen decides the state.
 */
export function SaveStatus({
  state,
  labels,
}: {
  state: SaveState;
  /** The words for each state, e.g. "Zapisane w telefonie". */
  labels: Record<SaveState, string>;
}) {
  return (
    <Chip role="status" dot={saveDots[state]}>
      {labels[state]}
    </Chip>
  );
}

/**
 * A fixed fact shown as a pill. Plain text: it never changes, so a screen
 * reader doesn't announce it as an update.
 */
export function FactChip({ children }: { children: ReactNode }) {
  return <Chip dot="bg-accent">{children}</Chip>;
}
