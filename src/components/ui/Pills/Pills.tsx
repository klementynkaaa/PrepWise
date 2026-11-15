import type { ReactNode } from "react";
import { cn } from "../_shared/cn";

const pill = "inline-flex shrink-0 rounded-full px-2 py-0.5 text-label whitespace-nowrap";

export type Source = "official" | "prepwise";

const sourceLooks: Record<Source, string> = {
  official: "bg-accent-tint-strong-solid text-accent",
  prepwise: "bg-surface-sunken text-ink-muted inset-ring inset-ring-line",
};

/**
 * Where a quantity comes from. Every quantity carries one. Shown short, read
 * out in full.
 */
export function SourcePill({
  source,
  labels,
}: {
  source: Source;
  /** Short text shown, and the full text read out, e.g. "Oficjalne" / "źródło: zalecenie oficjalne". */
  labels: { short: string; spoken: string };
}) {
  const { short, spoken } = labels;
  return (
    <span className={cn(pill, sourceLooks[source])}>
      <span aria-hidden="true">{short}</span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
}

export type Status = "missing" | "have" | "done";

const statuses: Record<Status, { label: string; look: string }> = {
  // Neutral, never red: missing is the normal state at the start, not an error.
  missing: { label: "Brakuje", look: "bg-surface text-ink inset-ring inset-ring-control-border" },
  have: { label: "Masz", look: "bg-accent text-on-accent" },
  done: { label: "Gotowe", look: "bg-accent text-on-accent" },
};

export function StatusPill({ status }: { status: Status }) {
  const { label, look } = statuses[status];
  return <span className={cn(pill, look)}>{label}</span>;
}

/** Who lives in the household, on the household card ("2 dorosłych"). */
export function MemberChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-7 shrink-0 items-center rounded-full bg-surface-sunken px-2.5 text-caption font-semibold">
      {children}
    </span>
  );
}
