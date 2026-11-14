import Link from "next/link";
import type { ReactNode } from "react";
import {
  progressAriaLabel,
  progressCountLabel,
  progressFractionLabel,
  progressPercent,
} from "@/lib/progress";
import { StatusPill } from "./Pills";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ProgressProps = { done: number; total: number };

/**
 * 48px ring. The label is one computed string ("3/7") so it can never render
 * half-filled (the mockups' "/38" bug); screen readers hear "Gotowe 3 z 7".
 */
export function ProgressRing({ done, total }: ProgressProps) {
  const length = (CIRCUMFERENCE * progressPercent(done, total)) / 100;
  return (
    <div className="relative size-progress-ring shrink-0">
      <svg
        role="img"
        aria-label={progressAriaLabel(done, total)}
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
        className="absolute inset-0 flex items-center justify-center text-label"
      >
        {progressFractionLabel(done, total)}
      </span>
    </div>
  );
}

/** 6px bar. Decorative alongside the visible count; read as "Gotowe 4 z 7". */
export function ProgressBar({ done, total }: ProgressProps) {
  return (
    <span
      role="img"
      aria-label={progressAriaLabel(done, total)}
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
  /** Shown after the count, e.g. "brakuje m.in. wody dla psa". */
  detail?: ReactNode;
  href?: string;
};

/**
 * A group with its progress. The count ("4 z 7") is always shown; the
 * percentage sits beside it, never instead of it. A complete group shows
 * "Gotowe". At large text the percentage moves under the name.
 */
export function ProgressBarRow({ name, detail, done, total, href }: ProgressBarRowProps) {
  const percent = progressPercent(done, total);
  const body = (
    <div className="flex flex-col gap-2 rounded-md p-2.5">
      <div className="grid grid-cols-row items-center gap-x-3 gap-y-1 @max-row-stack:grid-cols-1">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-body-strong">{name}</span>
          <span className="text-caption text-ink-muted">
            {progressCountLabel(done, total)}
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
      <ProgressBar done={done} total={total} />
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
