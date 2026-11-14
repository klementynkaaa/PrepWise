import type { ReactNode } from "react";
import { cn } from "./cn";

type PriorityHeaderProps = {
  tier: number;
  children: ReactNode;
  level?: 2 | 3;
};

/** Heading of a priority panel: the number in a circle, then the name. */
export function PriorityHeader({ tier, children, level = 2 }: PriorityHeaderProps) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <Heading className="flex items-center gap-2 px-2.5 py-2 text-control font-bold">
      <span
        aria-hidden="true"
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-caption font-bold text-on-accent"
      >
        {tier}
      </span>
      <span className="sr-only">Priorytet {tier}: </span>
      {children}
    </Heading>
  );
}

export type SaveState = "saved" | "offline";

const saveStates: Record<SaveState, { label: string; dot: string }> = {
  saved: { label: "Zapisane w telefonie", dot: "bg-accent" },
  offline: { label: "Offline · wszystko działa", dot: "bg-control-border" },
};

/**
 * Where the data is. Never "synchronizacja": nothing leaves the phone.
 * Display only; the screen decides the state.
 */
export function SaveStatus({ state }: { state: SaveState }) {
  const { label, dot } = saveStates[state];
  return (
    <span
      role="status"
      className="inline-flex min-h-chip items-center gap-2 self-start rounded-full bg-surface px-3 text-caption font-semibold whitespace-nowrap inset-ring inset-ring-line"
    >
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", dot)} />
      {label}
    </span>
  );
}
