import Link from "next/link";
import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: ReactNode;
  /** A count on the right, e.g. "12 z 38 gotowe". */
  meta?: ReactNode;
  /** Or one link on the right, e.g. "Zobacz wszystko". */
  action?: { href: string; label: string };
  level?: 2 | 3;
};

/** Sits above a panel, not inside it. */
export function SectionHeader({ title, meta, action, level = 2 }: SectionHeaderProps) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className="flex min-h-chip items-center justify-between gap-3 px-1 pt-2">
      <Heading className="text-heading-sm">{title}</Heading>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex min-h-touch items-center text-body-sm font-bold whitespace-nowrap text-accent"
        >
          {action.label}
        </Link>
      ) : (
        meta && (
          <span className="text-caption font-semibold whitespace-nowrap text-ink-muted">
            {meta}
          </span>
        )
      )}
    </div>
  );
}
