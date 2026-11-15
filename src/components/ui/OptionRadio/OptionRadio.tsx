"use client";

import { useId, type ReactNode } from "react";
import { cn } from "../_shared/cn";

type OptionRadioProps = {
  /** Shared by every radio of one group. */
  name: string;
  value: string;
  label: ReactNode;
  /** What the option means, always shown. */
  description?: ReactNode;
  checked: boolean;
  onChange: (value: string) => void;
};

/** A selectable option card with a native radio: one choice out of several. */
export function OptionRadio({
  name,
  value,
  label,
  description,
  checked,
  onChange,
}: OptionRadioProps) {
  const descriptionId = useId();

  return (
    <label
      className={cn(
        "flex min-h-touch items-start gap-3 rounded-md p-3",
        checked
          ? "bg-accent-tint inset-ring-strong inset-ring-accent"
          : "bg-surface inset-ring inset-ring-control-border",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        aria-describedby={description ? descriptionId : undefined}
        className="size-6 shrink-0 accent-accent"
      />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-body-strong">{label}</span>
        {description && (
          <span id={descriptionId} className="text-body-sm text-ink-muted">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
