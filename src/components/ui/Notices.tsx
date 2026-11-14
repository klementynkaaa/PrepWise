import type { ReactNode } from "react";
import { Icon } from "./icons";

type NoticeProps = {
  children: ReactNode;
  icon?: "info" | "offline";
};

/** A calm notice: offline, install hint, plan changed. Never alarming. */
export function Notice({ children, icon = "info" }: NoticeProps) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-md bg-notice-bg px-4 py-3 text-body-sm"
    >
      <Icon name={icon} />
      <span>{children}</span>
    </div>
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
