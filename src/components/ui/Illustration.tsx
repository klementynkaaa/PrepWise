import { cn } from "./cn";

// Soft flat illustrations (style B) from the Design System's Illustrations
// group, served from public/illustrations/ and precached for offline use.
// Always decorative: the heading and text next to them carry the meaning.

const groups = {
  state: { width: 240, height: 200, look: "w-50 max-w-full" },
  banner: { width: 360, height: 140, look: "w-full" },
  hero: { width: 360, height: 240, look: "w-full" },
  item: { width: 80, height: 80, look: "size-20" },
  divider: { width: 360, height: 40, look: "w-full" },
} as const;

type Group = keyof typeof groups;

const illustrations = {
  "empty-kit": "state",
  "kit-complete": "state",
  "generating-plan": "state",
  "empty-shopping": "state",
  "no-results": "state",
  offline: "state",
  "not-found": "state",
  error: "state",
  "storage-error": "state",
  "banner-water": "banner",
  "banner-install": "banner",
  "banner-plan-ready": "banner",
  "hero-welcome": "hero",
  "item-water": "item",
  "item-food": "item",
  "item-radio": "item",
  "item-flashlight": "item",
  "item-first-aid": "item",
  "item-candle": "item",
  "item-backpack": "item",
  "divider-pattern": "divider",
} as const satisfies Record<string, Group>;

export type IllustrationName = keyof typeof illustrations;

export const illustrationNames = Object.keys(illustrations) as IllustrationName[];

/** The state scenes (240 × 200): empty lists, offline, errors, done. */
export type StateIllustrationName = {
  [Name in IllustrationName]: (typeof illustrations)[Name] extends "state" ? Name : never;
}[IllustrationName];

export const stateIllustrationNames = illustrationNames.filter(
  (name): name is StateIllustrationName => illustrations[name] === "state",
);

export function Illustration({ name }: { name: IllustrationName }) {
  const { width, height, look } = groups[illustrations[name]];
  return (
    // A static SVG from public/: next/image needs a server-side loader, which
    // the static export doesn't have.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/illustrations/${name}.svg`}
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      className={cn("block h-auto shrink-0 self-center", look)}
    />
  );
}
