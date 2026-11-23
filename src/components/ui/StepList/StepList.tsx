import type { ReactNode } from "react";
import { Icon } from "../Icon";

type StepState = "done" | "current" | "later";

/** A white panel with a vertical list of steps. Fill it with `Step`s. */
export function StepList({ children }: { children: ReactNode }) {
  return <ol className="flex flex-col rounded-lg bg-surface p-2 shadow-panel">{children}</ol>;
}

type StepProps = {
  state: StepState;
  /** The state in words for screen readers: "zrobione", "teraz", "później" (`home.todo.status`). */
  statusLabel: string;
  name: ReactNode;
  caption: ReactNode;
  /** A small button or link under the caption; only the current step has one. */
  action?: ReactNode;
};

/**
 * One step: a marker (check, ring with a dot, or an empty circle) with a
 * connector to the next step, the name, a caption and, for the current step, an
 * action. A done step's name is muted; the current step sits on a tinted row.
 * The state is not left to colour and shape alone: a visually hidden word names it.
 */
export function Step({ state, statusLabel, name, caption, action }: StepProps) {
  return (
    <li
      className={`group/step flex gap-3 rounded-md p-2.5 ${state === "current" ? "bg-accent-tint" : ""}`}
    >
      <span className="flex shrink-0 flex-col items-center">
        {state === "done" ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-accent text-on-accent">
            <Icon name="check" size="sm" />
          </span>
        ) : state === "current" ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-surface inset-ring-strong inset-ring-accent">
            <span className="size-2.5 rounded-full bg-accent" />
          </span>
        ) : (
          <span className="size-6 rounded-full bg-surface inset-ring-strong inset-ring-ink-muted" />
        )}
        <span
          aria-hidden="true"
          className={`my-1 min-h-3.5 w-0.5 flex-1 rounded-full group-last/step:hidden ${
            state === "done" ? "bg-accent" : "bg-line"
          }`}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`text-body-strong ${state === "done" ? "text-ink-muted" : ""}`}>
          {name}
        </span>
        <span className="text-caption text-ink-muted">{caption}</span>
        {action ? <span className="mt-2 flex">{action}</span> : null}
        <span className="sr-only">{statusLabel}</span>
      </span>
    </li>
  );
}
