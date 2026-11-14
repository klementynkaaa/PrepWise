"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./cn";
import { Icon, type IconName } from "./icons";

export type TabItem = { href: string; label: string; icon: IconName };

type TabBarProps = {
  items: readonly TabItem[];
  /** Overrides the current route (used by the /system showcase). */
  currentHref?: string;
};

function isCurrent(itemHref: string, current: string): boolean {
  if (itemHref === "/") return current === "/";
  return current === itemHref || current.startsWith(`${itemHref}/`);
}

/** Main navigation. Labels are always visible: an icon alone isn't enough. */
export function TabBar({ items, currentHref }: TabBarProps) {
  const pathname = usePathname();
  const current = currentHref ?? pathname ?? "/";

  return (
    <nav aria-label="Główna nawigacja" className="w-full border-t border-line bg-surface">
      <ul className="mx-auto grid max-w-app auto-cols-fr grid-flow-col gap-1 px-2 pt-2 pb-2">
        {items.map((item) => {
          const active = isCurrent(item.href, current);
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-tab flex-1 flex-col items-center justify-center gap-1 rounded-md text-label",
                  active ? "bg-accent-tint font-bold text-accent" : "font-semibold text-ink-muted",
                )}
              >
                <Icon name={item.icon} size="lg" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
