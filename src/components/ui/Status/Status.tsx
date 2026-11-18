import type { ReactNode } from "react";
import { cn } from "../_shared/cn";

type PriorityHeaderProps = {
  tier: number;
  /** Spoken in full before the name, e.g. "Priorytet 2". Not shown. */
  tierLabel: string;
  children: ReactNode;
  level?: 2 | 3;
};

/** Heading of a priority panel: the number in a circle, then the name. */
export function PriorityHeader({ tier, tierLabel, children, level = 2 }: PriorityHeaderProps) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <Heading className="flex items-center gap-2 px-2.5 py-2 text-control font-bold">
      <PriorityBadge tier={tier} />
      <span className="sr-only">{tierLabel}: </span>
      {children}
    </Heading>
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
