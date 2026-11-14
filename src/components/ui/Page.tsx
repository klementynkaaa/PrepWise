import type { ReactNode } from "react";
import { BackLink } from "./TextLink";

/**
 * The page column: one mobile-width column at every screen size, capped at
 * 32rem and centred on the mist background.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-app flex-1 flex-col">{children}</div>;
}

type TopBarProps = {
  back?: { href: string; label?: string };
  /** Progress through a flow, e.g. "Krok 1 z 4". */
  step?: string;
};

export function TopBar({ back, step }: TopBarProps) {
  return (
    <div className="flex min-h-12 items-center justify-between px-3 pt-1">
      {back ? <BackLink href={back.href}>{back.label}</BackLink> : <span />}
      {step && <span className="px-2 text-caption font-semibold text-ink-muted">{step}</span>}
    </div>
  );
}

type PageHeaderProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  lead?: ReactNode;
};

/** The screen title block: optional eyebrow, the one h1, optional lead. */
export function PageHeader({ title, eyebrow, lead }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2 px-5 pt-1">
      {eyebrow && <p className="text-caption font-semibold text-ink-muted">{eyebrow}</p>}
      <h1 className="text-display text-balance">{title}</h1>
      {lead && <p className="text-body">{lead}</p>}
    </header>
  );
}

/** Main content under the header: page gutter and the gap between panels. */
export function PageBody({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">{children}</main>;
}

/** The bottom of a step, where the main action sits in thumb reach. */
export function PageFooter({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex flex-col gap-1 px-4 pt-3 pb-2.5">{children}</div>;
}

export function Wordmark() {
  return <span className="text-control font-extrabold tracking-wordmark">PREPWISE</span>;
}
