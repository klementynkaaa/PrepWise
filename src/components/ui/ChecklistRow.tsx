"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./icons";

type ChecklistRowProps = {
  name: ReactNode;
  /** e.g. "27 l · np. 6 butelek po 5 l". */
  detail?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * A row to tick off. Done is shown by a sunken background, a check mark and
 * the word "Mam" — never by colour alone, and never struck through.
 */
export function ChecklistRow({ name, detail, checked, onChange }: ChecklistRowProps) {
  return (
    <div className="@container mb-1 last:mb-0">
      <label
        className={cn(
          "flex items-center gap-3 rounded-md p-2.5 @max-row-stack:flex-wrap",
          checked && "bg-surface-sunken",
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="size-6 shrink-0 accent-accent"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-strong">{name}</span>
          {detail && <span className="text-caption text-ink-muted">{detail}</span>}
        </span>
        {checked && (
          <span className="inline-flex shrink-0 items-center gap-1 text-caption font-bold text-accent">
            <Icon name="check" />
            Mam
          </span>
        )}
      </label>
    </div>
  );
}
