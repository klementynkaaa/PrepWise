import Link from "next/link";
import type { ReactNode } from "react";

type SummaryRowProps = {
  label: ReactNode;
  value: ReactNode;
  action: {
    href: string;
    label: ReactNode;
    /** A longer name when the visible label alone is unclear ("Zmień: Domownicy"). */
    ariaLabel?: string;
  };
};

/** A saved answer with a link to change it, e.g. in the profile overview. */
export function SummaryRow({ label, value, action }: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 p-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-caption font-semibold text-ink-muted">{label}</span>
        <span className="text-body-strong break-words">{value}</span>
      </div>
      <Link
        href={action.href}
        aria-label={action.ariaLabel}
        className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-end text-body-strong text-accent"
      >
        {action.label}
      </Link>
    </div>
  );
}
