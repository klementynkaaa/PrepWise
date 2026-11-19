"use client";

import { useId, type ReactNode } from "react";
import { cn } from "../_shared/cn";

type ChecklistRowProps = {
  /** The checkbox's accessible name, e.g. "Woda". */
  name: ReactNode;
  /** The line under the name, e.g. "3 l × 3 osoby × 3 dni". */
  detail?: ReactNode;
  /** Shown on the right, e.g. "27 l"; stacks under the name at large text. */
  quantity?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Marks the first thing to do: the row is tinted and shows this text (e.g. "Najpierw"). */
  first?: { label: ReactNode };
};

/**
 * A row to tick off: checkbox · name and detail · quantity. Ticked is a
 * checked box on a grey (sunken) row, never a strike-through. The native
 * checkbox is the control and is named by `name` alone; the "Najpierw" text,
 * detail and quantity are read as its description. At large text the
 * quantity moves under the name (container query, like `PlanRow`).
 */
export function ChecklistRow({
  name,
  detail,
  quantity,
  checked,
  onChange,
  first,
}: ChecklistRowProps) {
  const id = useId();
  const nameId = `${id}-name`;
  const described = [
    first && `${id}-first`,
    detail && `${id}-detail`,
    quantity && `${id}-quantity`,
  ].filter(Boolean);

  return (
    <div className="@container">
      <label
        className={cn(
          "flex items-center gap-3 rounded-md p-2.5",
          checked ? "bg-surface-sunken" : first && "bg-accent-tint",
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-labelledby={nameId}
          aria-describedby={described.length > 0 ? described.join(" ") : undefined}
          className="size-6 shrink-0 accent-accent"
        />
        <span className="grid min-w-0 flex-1 grid-cols-row items-center gap-x-3 gap-y-1 @max-row-stack:grid-cols-1">
          {first && (
            <span id={`${id}-first`} className="col-span-full text-label text-accent">
              {first.label}
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <span id={nameId} className="text-body-strong">
              {name}
            </span>
            {detail && (
              <span id={`${id}-detail`} className="text-caption text-ink-muted">
                {detail}
              </span>
            )}
          </span>
          {quantity && (
            <span
              id={`${id}-quantity`}
              className="justify-self-end text-body-strong font-bold whitespace-nowrap @max-row-stack:justify-self-start @max-row-stack:whitespace-normal"
            >
              {quantity}
            </span>
          )}
        </span>
      </label>
    </div>
  );
}
