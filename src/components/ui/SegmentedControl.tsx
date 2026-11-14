"use client";

import { cn } from "./cn";
import { useRovingRadio } from "./useRovingRadio";

export type ChoiceOption<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  /** Accessible name of the group, e.g. "Czy macie zwierzęta?". */
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Stretch across the card (72 h / 7 dni / 14 dni). */
  fullWidth?: boolean;
};

/** Yes/No and other short single choices. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  fullWidth,
}: SegmentedControlProps<T>) {
  const radio = useRovingRadio(
    options.map((option) => option.value),
    value,
    onChange,
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "gap-1 rounded-full bg-surface-sunken p-1",
        fullWidth ? "flex w-full" : "inline-flex shrink-0",
      )}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          {...radio(index)}
          className={cn(
            "inline-flex min-h-touch min-w-15 items-center justify-center rounded-full px-4 text-control",
            fullWidth && "flex-1",
            option.value === value ? "bg-accent text-on-accent" : "text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
