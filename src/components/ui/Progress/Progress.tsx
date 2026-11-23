import Link from "next/link";
import type { ReactNode } from "react";
import { progressPercent } from "@/lib/progress";
import { StatusPill } from "../Pills";
import { cn } from "../_shared/cn";
import { Icon } from "../Icon";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ProgressProps = {
  done: number;
  total: number;
  /** What a screen reader hears, e.g. "Gotowe 3 z 7" (`progress.done`). */
  label: string;
};

type ProgressRingProps = ProgressProps & {
  /** The short count inside the ring, e.g. "3/7" (`progress.fraction`). */
  fraction: string;
  /**
   * `lg` (80px) and `xl` (88px, for a percentage) head a screen, as on Start,
   * and show a check mark instead of the text once everything is done; `md`
   * (48px) sits in a row.
   */
  size?: "md" | "lg" | "xl";
  /**
   * Hidden from screen readers when visible words beside it already say the
   * count (e.g. inside a link, where it would join the link's name).
   */
  decorative?: boolean;
};

/**
 * Progress ring. The text inside is one string ("3/7") so it can never render
 * half-filled (the mockups' "/38" bug); screen readers hear the label.
 */
export function ProgressRing({
  done,
  total,
  label,
  fraction,
  size = "md",
  decorative = false,
}: ProgressRingProps) {
  const length = (CIRCUMFERENCE * progressPercent(done, total)) / 100;
  return (
    <div
      aria-hidden={decorative || undefined}
      className={cn(
        "relative shrink-0",
        size === "xl"
          ? "size-progress-ring-xl"
          : size === "lg"
            ? "size-progress-ring-lg"
            : "size-progress-ring",
      )}
    >
      <svg
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : label}
        viewBox="0 0 48 48"
        className="size-full"
      >
        <circle
          cx="24"
          cy="24"
          r={RADIUS}
          fill="none"
          strokeWidth="5"
          className="stroke-accent-tint-strong"
        />
        {length > 0 && (
          <circle
            cx="24"
            cy="24"
            r={RADIUS}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${length.toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`}
            transform="rotate(-90 24 24)"
            className="stroke-accent"
          />
        )}
      </svg>
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          size === "xl"
            ? "text-title"
            : size === "lg"
              ? "text-body-strong font-bold"
              : "text-label",
        )}
      >
        {size !== "md" && total > 0 && done >= total ? (
          <span className="text-accent">
            <Icon name="check" size="xl" />
          </span>
        ) : (
          fraction
        )}
      </span>
    </div>
  );
}

/** 6px bar. Shown alongside a visible count; read as its label ("Gotowe 4 z 7"). */
export function ProgressBar({ done, total, label }: ProgressProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className="block h-bar overflow-hidden rounded-full bg-accent-tint-strong"
    >
      <span
        className="block h-full rounded-full bg-accent"
        style={{ width: `${progressPercent(done, total)}%` }}
      />
    </span>
  );
}

type ProgressBarRowProps = ProgressProps & {
  name: ReactNode;
  /** The visible count, e.g. "4 z 7" (`progress.count`). Always shown. */
  count: ReactNode;
  /** Shown after the count, e.g. "brakuje m.in. wody dla psa". */
  detail?: ReactNode;
  href?: string;
};

/**
 * A group with its progress. The count ("4 z 7") is always shown; the
 * percentage sits beside it, never instead of it. A complete group shows
 * "Gotowe". At large text the percentage moves under the name.
 */
export function ProgressBarRow({
  name,
  count,
  detail,
  done,
  total,
  label,
  href,
}: ProgressBarRowProps) {
  const percent = progressPercent(done, total);
  const body = (
    <div className="flex flex-col gap-2 rounded-md p-2.5">
      <div className="grid grid-cols-row items-center gap-x-3 gap-y-1 @max-row-stack:grid-cols-1">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-body-strong">{name}</span>
          <span className="text-caption text-ink-muted">
            {count}
            {detail && <> · {detail}</>}
          </span>
        </span>
        <span className="justify-self-end @max-row-stack:justify-self-start">
          {percent === 100 ? (
            <StatusPill status="done" />
          ) : (
            <span className="text-body-sm font-bold whitespace-nowrap">{percent}%</span>
          )}
        </span>
      </div>
      <ProgressBar done={done} total={total} label={label} />
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
