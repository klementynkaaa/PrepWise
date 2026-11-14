"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";
import type { ChoiceOption } from "./SegmentedControl";
import { useRovingRadio } from "./useRovingRadio";

const chip =
  "inline-flex min-h-touch items-center gap-2 rounded-full px-4 text-control whitespace-nowrap";

type ChipGroupProps<T extends string> = {
  /** Accessible name of the group, e.g. "Pokaż". */
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Optional trailing chip, e.g. <ChipLink href="…">+ Dodaj sytuację</ChipLink>. */
  after?: ReactNode;
};

/**
 * Filter chips (one choice). They wrap onto new lines at large text and never
 * scroll sideways. `after` sits beside the group, outside the radiogroup.
 */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  after,
}: ChipGroupProps<T>) {
  const radio = useRovingRadio(
    options.map((option) => option.value),
    value,
    onChange,
  );

  return (
    <div className="flex flex-wrap gap-2">
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <button
            key={option.value}
            {...radio(index)}
            className={cn(
              chip,
              option.value === value
                ? "bg-accent text-on-accent"
                : "bg-surface text-ink inset-ring inset-ring-control-border",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {after}
    </div>
  );
}

/** A chip-shaped link, for "+ Dodaj sytuację" after a ChipGroup. */
export function ChipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(chip, "bg-surface text-accent inset-ring inset-ring-control-border")}
    >
      {children}
    </Link>
  );
}
