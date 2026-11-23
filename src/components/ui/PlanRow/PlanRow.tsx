import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../_shared/cn";
import { SourcePill, type Source } from "../Pills";

type PlanRowProps = {
  name: ReactNode;
  /** The working behind the number, e.g. "3 l × 3 osoby × 3 dni". */
  formula: ReactNode;
  quantity: ReactNode;
  source: Source;
  /** Short and spoken text of the source pill, passed to SourcePill. */
  sourceLabels: { short: string; spoken: string };
  /** Marks the first thing to do: the row is highlighted and shows this text (e.g. "Najpierw"). */
  firstLabel?: string;
  /** Emergency tags (`EmergencyTags`), shown under the caption on the left. */
  tags?: ReactNode;
  href?: string;
};

/**
 * Two-line plan row: name + quantity, then formula + source pill. At large
 * text the row stacks (container query on its own width): name, quantity,
 * formula, pill. Optional tags sit under the formula, on the left.
 */
export function PlanRow({
  name,
  formula,
  quantity,
  source,
  sourceLabels,
  firstLabel,
  tags,
  href,
}: PlanRowProps) {
  const body = (
    <div
      className={cn(
        "grid grid-cols-row items-start gap-x-3 gap-y-1 rounded-md p-2.5 @max-row-stack:grid-cols-1",
        firstLabel && "bg-accent-tint",
      )}
    >
      {firstLabel && <span className="col-span-full text-label text-accent">{firstLabel}</span>}
      <span className="text-body-strong">{name}</span>
      <span className="justify-self-end text-body-strong font-bold whitespace-nowrap @max-row-stack:justify-self-start">
        {quantity}
      </span>
      <span className="flex min-w-0 flex-col items-start gap-1">
        <span className="text-caption text-ink-muted">{formula}</span>
        {tags}
      </span>
      <span className="justify-self-end @max-row-stack:justify-self-start">
        <SourcePill source={source} labels={sourceLabels} />
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
