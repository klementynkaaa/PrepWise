import type { ReactNode } from "react";
import { Icon } from "../Icon";

type NoticeProps = {
  children: ReactNode;
  /** `check` marks something finished (e.g. every supply ticked on Start). */
  icon?: "info" | "offline" | "check";
  /**
   * `false` when the notice appears only after something happened (a failed
   * save): a live region added already filled is often not read, so the
   * screen puts the same words in an always-present `LiveStatus` instead.
   */
  live?: boolean;
};

/** A calm notice: offline, install hint, plan changed. Never alarming. */
export function Notice({ children, icon = "info", live = true }: NoticeProps) {
  return (
    <div
      role={live ? "status" : undefined}
      className="flex items-start gap-2.5 rounded-md bg-notice-bg px-4 py-3 text-body-sm"
    >
      <span className={icon === "check" ? "text-accent" : undefined}>
        <Icon name={icon} />
      </span>
      <span>{children}</span>
    </div>
  );
}

/**
 * A polite status heard only by screen readers. Render it from the first
 * paint, empty, and fill it when something happens; a region that appears
 * already filled is often not announced.
 */
export function LiveStatus({ children }: { children?: ReactNode }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}

type AlertProps = { title: ReactNode; children: ReactNode };

/** A blocking failure (e.g. storage failed). The only red panel. */
export function Alert({ title, children }: AlertProps) {
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-md bg-error-bg p-4">
      <p className="text-control font-bold text-error">{title}</p>
      <p className="text-body-sm">{children}</p>
    </div>
  );
}

/** A hint built only from real numbers ("Jeszcze 6 rzeczy z priorytetu 1…"). */
export function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-notice-bg p-4 text-body-sm">
      <span className="text-accent">
        <Icon name="info" />
      </span>
      <span>{children}</span>
    </div>
  );
}
