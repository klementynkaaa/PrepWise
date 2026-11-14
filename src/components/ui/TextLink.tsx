import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icons";

type TextLinkProps = { href: string; children: ReactNode };

/** A standalone text link with a 44px tap area ("Skąd te ilości?"). */
export function TextLink({ href, children }: TextLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-touch items-center self-start text-body-strong text-accent"
    >
      {children}
    </Link>
  );
}

type BackLinkProps = { href: string; children?: ReactNode };

/** The back link at the top of a step. */
export function BackLink({ href, children = "Wstecz" }: BackLinkProps) {
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
