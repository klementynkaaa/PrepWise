import type { ReactNode } from "react";
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
 * (e.g. "Wczytywanie…") once to a screen reader.
 */
export function SkeletonGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div aria-busy="true" className={cn("flex flex-col gap-3", className)}>
      <p role="status" className="sr-only">
        {label}
      </p>
      {children}
    </div>
  );
}
