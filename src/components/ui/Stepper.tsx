"use client";

import { useId } from "react";
import { cn } from "./cn";
import { Icon } from "./icons";

type StepperProps = {
  label: string;
  /** e.g. "18–64 lata". */
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  /** Shown under the stepper and read as its description. */
  error?: string;
  /**
   * Polish names for the buttons, e.g. "Mniej dorosłych" / "Więcej dorosłych".
   * Polish inflection can't be derived from the label, so pass them when you
   * can; the fallback is "Zmniejsz: <label>" / "Zwiększ: <label>".
   */
  decreaseLabel?: string;
  increaseLabel?: string;
};

const button = "inline-flex size-touch shrink-0 items-center justify-center rounded-full";
const unavailable = "cursor-not-allowed bg-disabled-bg text-disabled-ink";

/** Person counter: − value +. Controlled; the screen owns the number. */
export function Stepper({
  label,
  hint,
  value,
  min = 0,
  max,
  onChange,
  error,
  decreaseLabel = `Zmniejsz: ${label}`,
  increaseLabel = `Zwiększ: ${label}`,
}: StepperProps) {
  const labelId = useId();
  const errorId = useId();
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;
  const describedBy = error ? errorId : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface px-3 py-2.5",
          error ? "inset-ring-strong inset-ring-error" : "inset-ring inset-ring-line",
        )}
      >
        <span className="flex min-w-0 flex-col">
          <span id={labelId} className="text-body-strong">
            {label}
          </span>
          {hint && <span className="text-caption text-ink-muted">{hint}</span>}
        </span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            aria-label={decreaseLabel}
            aria-disabled={atMin || undefined}
            aria-describedby={describedBy}
            onClick={() => {
              if (!atMin) onChange(value - 1);
            }}
            className={cn(button, atMin ? unavailable : "bg-surface-sunken text-ink")}
          >
            <Icon name="minus" />
          </button>
          <span
            aria-live="polite"
            className={cn("min-w-7 text-center text-number", value === 0 && "text-ink-muted")}
          >
            {value}
          </span>
          <button
            type="button"
            aria-label={increaseLabel}
            aria-disabled={atMax || undefined}
            aria-describedby={describedBy}
            onClick={() => {
              if (!atMax) onChange(value + 1);
            }}
            className={cn(button, atMax ? unavailable : "bg-accent-tint-strong text-accent")}
          >
            <Icon name="plus" />
          </button>
        </span>
      </div>
      {error && (
        <p id={errorId} className="text-body-sm font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  );
}
