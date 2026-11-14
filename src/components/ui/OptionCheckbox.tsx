"use client";

import { useId, type ReactNode } from "react";
import { cn } from "./cn";

type OptionCheckboxProps = {
  label: ReactNode;
  /** What the option means, always shown. */
  description?: ReactNode;
  /** What choosing it adds, shown only when checked ("Dodamy: latarki…"). */
  checkedNote?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** A selectable option card with a native checkbox (e.g. an emergency). */
export function OptionCheckbox({
  label,
  description,
  checkedNote,
  checked,
  onChange,
}: OptionCheckboxProps) {
  const descriptionId = useId();
  const noteId = useId();
  const showNote = checked && checkedNote;
  const describedBy =
    [description && descriptionId, showNote && noteId].filter(Boolean).join(" ") || undefined;

  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-md p-3",
        checked
          ? "bg-accent-tint inset-ring-strong inset-ring-accent"
          : "bg-surface inset-ring inset-ring-control-border",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={describedBy}
        className="size-6 shrink-0 accent-accent"
      />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-body-strong">{label}</span>
        {description && (
          <span id={descriptionId} className="text-body-sm text-ink-muted">
            {description}
          </span>
        )}
        {showNote && (
          <span id={noteId} className="text-caption font-semibold text-accent">
            {checkedNote}
          </span>
        )}
      </span>
    </label>
  );
}
