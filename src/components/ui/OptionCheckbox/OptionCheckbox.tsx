"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "../_shared/cn";

type OptionCheckboxProps = {
  label: ReactNode;
  /** What the option means, always shown. */
  description?: ReactNode;
  /** What choosing it adds, shown only when checked ("Dodamy: latarki…"). */
  checkedNote?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /**
   * An optional explanation under the card, opened by a link-style button
   * outside the label ("Co dodaje?" / "Zwiń"). Opening it never changes `checked`.
   */
  details?: { openLabel: string; closeLabel: string; content: ReactNode };
};

/** A selectable option card with a native checkbox (e.g. an emergency). */
export function OptionCheckbox({
  label,
  description,
  checkedNote,
  checked,
  onChange,
  details,
}: OptionCheckboxProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const descriptionId = useId();
  const noteId = useId();
  const showNote = checked && checkedNote;
  const describedBy =
    [description && descriptionId, showNote && noteId].filter(Boolean).join(" ") || undefined;

  const card = (
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

  if (!details) return card;

  return (
    <div className="flex flex-col">
      {card}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((value) => !value)}
        className="inline-flex min-h-touch items-center self-start px-3 text-body-strong text-accent"
      >
        {expanded ? details.closeLabel : details.openLabel}
      </button>
      <div
        id={detailsId}
        hidden={!expanded}
        className="rounded-md bg-surface p-3 text-body-sm inset-ring inset-ring-line"
      >
        {details.content}
      </div>
    </div>
  );
}
