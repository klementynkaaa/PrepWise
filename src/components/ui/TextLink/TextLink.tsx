import Link from "next/link";
import type { MouseEvent, ReactNode, Ref } from "react";
import { cn } from "../_shared/cn";
import { Icon } from "../Icon";

export type TextLinkSize = "body" | "caption";

const looks: Record<TextLinkSize, string> = {
  // Standalone: a 44px tap area.
  body: "min-h-touch self-start text-body-strong",
  // Inside a caption line (e.g. a plan row's formula): caption text, 24px target.
  caption: "min-h-6 text-caption font-semibold",
};

type TextLinkProps = {
  /** A route, or an in-page anchor such as "#section-pets". */
  href: string;
  children: ReactNode;
  size?: TextLinkSize;
};

/** A text link: standalone ("Skąd te ilości?") or inside a caption line. */
export function TextLink({ href, children, size = "body" }: TextLinkProps) {
  return (
    <Link href={href} className={cn("inline-flex items-center text-accent", looks[size])}>
      {children}
    </Link>
  );
}

type TextButtonProps = {
  children: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Set when the button opens a dialog or a sheet. */
  "aria-haspopup"?: "dialog";
  /** Lets the screen return focus here, e.g. when a sheet closes. */
  ref?: Ref<HTMLButtonElement>;
};

/** Looks like `TextLink`, but acts on the page instead of leaving it. */
export function TextButton({ children, onClick, "aria-haspopup": hasPopup, ref }: TextButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup={hasPopup}
      onClick={onClick}
      className="inline-flex min-h-touch items-center text-body-strong text-accent"
    >
      {children}
    </button>
  );
}

type BackLinkProps = { href: string; children: ReactNode };

/** The back link at the top of a step. */
export function BackLink({ href, children }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-touch items-center gap-1 rounded-md px-2 text-body-strong text-accent"
    >
      <Icon name="back" />
      {children}
    </Link>
  );
}
