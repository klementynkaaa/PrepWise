import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { SourcePill, type Source } from "./Pills";

type PlanRowProps = {
  name: ReactNode;
  /** The working behind the number, e.g. "3 l × 3 osoby × 3 dni". */
  formula: ReactNode;
  quantity: ReactNode;
  source: Source;
  /** The first thing to do: highlighted and labelled "Najpierw". */
  first?: boolean;
  href?: string;
};

/**
 * Two-line plan row: name + quantity, then formula + source pill. At large
 * text the row stacks (container query on its own width): name, quantity,
 * formula, pill.
 */
export function PlanRow({ name, formula, quantity, source, first, href }: PlanRowProps) {
  const body = (
    <div
      className={cn(
        "grid grid-cols-row items-start gap-x-3 gap-y-1 rounded-md p-2.5 @max-row-stack:grid-cols-1",
        first && "bg-accent-tint",
      )}
    >
      {first && <span className="col-span-full text-label text-accent">Najpierw</span>}
      <span className="text-body-strong">{name}</span>
      <span className="justify-self-end text-body-strong font-bold whitespace-nowrap @max-row-stack:justify-self-start">
        {quantity}
      </span>
      <span className="text-caption text-ink-muted">{formula}</span>
      <span className="justify-self-end @max-row-stack:justify-self-start">
        <SourcePill source={source} />
      </span>
    </div>
  );

  return (
    <div className="@container">
      {href ? (
        <Link href={href} className="block rounded-md">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}
