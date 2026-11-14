"use client";

import type { ReactNode } from "react";

type UndoBarProps = {
  /** e.g. "Odznaczono: Kup wodę pitną". */
  message: ReactNode;
  onUndo: () => void;
};

/**
 * Undo after unticking. It never disappears on its own: the screen removes it
 * at the next action, so slow readers and screen-reader users aren't rushed.
 */
export function UndoBar({ message, onUndo }: UndoBarProps) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-2.5 rounded-md bg-ink py-2 pr-2 pl-4 text-body-sm text-on-accent"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex min-h-touch shrink-0 items-center rounded-full bg-surface px-4 text-control font-bold text-ink"
      >
        Cofnij
      </button>
    </div>
  );
}
