"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./icons";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
};

/**
 * A sheet from the bottom of the screen on the native <dialog>: focus stays
 * inside, the page behind is inert, Escape and a tap on the scrim close it,
 * and focus returns to the opener. Controlled by `open`.
 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Escape: let the screen decide (it sets open=false), don't close behind its back.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click on the dialog element itself is a click on the scrim around the sheet.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 mx-auto mt-auto max-h-dvh w-full max-w-app rounded-t-lg bg-surface p-0 text-ink backdrop:bg-scrim"
    >
      <div className="flex flex-col gap-4 px-5 pt-2.5 pb-5">
        <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-disabled-bg" />
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-title">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Zamknij"
            onClick={onClose}
            className="inline-flex size-touch shrink-0 items-center justify-center rounded-full text-ink-muted"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
