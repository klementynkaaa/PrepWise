"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../_shared/cn";

export type SkeletonShape = "line" | "block" | "banner";

const shapes: Record<SkeletonShape, string> = {
  line: "h-4 w-full rounded-sm",
  block: "h-20 w-full rounded-sm",
  // Same ratio as the banner art (360 × 140), so the page doesn't jump.
  banner: "aspect-18/7 w-full rounded-lg",
};

/**
 * A grey placeholder block that holds a page's shape while local data opens.
 * Decorative: the surrounding SkeletonGroup announces the loading once.
 */
export function Skeleton({
  shape = "line",
  className,
}: {
  shape?: SkeletonShape;
  /** Layout only (width, margin), never colour or radius. */
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("shrink-0 bg-line motion-safe:animate-pulse", shapes[shape], className)}
    />
  );
}

/**
 * Wraps the placeholders of one page: marks it busy and says the label
 * (e.g. "Wczytywanie…") once to a screen reader. The status starts empty and
 * gets the label right after mount, because text already in a live region
 * when it appears is often not read. Inside a container that is already
 * `aria-busy` (e.g. the page's `<main>`), pass `busy={false}`: nested busy
 * regions can keep the status from being read.
 */
export function SkeletonGroup({
  label,
  children,
  className,
  busy = true,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  /** Set `aria-busy` on the group. Off when an outer container already is busy. */
  busy?: boolean;
}) {
  const [announced, setAnnounced] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnounced(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div aria-busy={busy || undefined} className={cn("flex flex-col gap-3", className)}>
      <p role="status" className="sr-only">
        {announced ? label : null}
      </p>
      {children}
    </div>
  );
}
