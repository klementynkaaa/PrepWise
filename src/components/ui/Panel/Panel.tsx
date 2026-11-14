import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  /** "section" when the panel is a titled region of the page. */
  as?: "div" | "section";
};

/** A white panel on the mist background, with the system's only shadow. */
export function Panel({ children, as: Tag = "div" }: PanelProps) {
  return (
    <Tag className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-panel">{children}</Tag>
  );
}

/** A panel that holds rows; rows bring their own padding. */
export function PanelList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col rounded-lg bg-surface p-2 shadow-panel">{children}</div>;
}

/** A hairline between rows inside a panel. Decorative. */
export function Divider() {
  return <hr className="mx-2.5 my-1 h-px border-0 bg-line" />;
}

/** A small heading for a group of rows inside a panel. */
export function ListSectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="px-2.5 pt-1 pb-1 text-caption font-bold text-ink-muted">{children}</h3>;
}

type KeyValueRowProps = { label: ReactNode; value: ReactNode };

/** A label with its value on the right, e.g. in a summary. */
export function KeyValueRow({ label, value }: KeyValueRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 p-2.5">
      <span className="text-body">{label}</span>
      <span className="text-right text-body-strong">{value}</span>
    </div>
  );
}
