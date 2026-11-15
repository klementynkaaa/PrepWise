export type LogoSize = "sm" | "md" | "lg";

const sizes = {
  sm: { mark: 20, name: "text-logo-sm", gap: "gap-1.5" },
  md: { mark: 32, name: "text-logo-md", gap: "gap-2" },
  lg: { mark: 40, name: "text-logo-lg", gap: "gap-3" },
} as const satisfies Record<LogoSize, { mark: number; name: string; gap: string }>;

/**
 * The PREPWISE logo: the mark beside the name, the mark about as tall as the
 * name. One image for assistive technology, so it reads as "PREPWISE" once.
 */
export function Logo({ size = "sm" }: { size?: LogoSize }) {
  const { mark, name, gap } = sizes[size];
  return (
    <span role="img" aria-label="PREPWISE" className={`inline-flex items-center ${gap}`}>
      <svg
        aria-hidden="true"
        width={mark}
        height={mark}
        viewBox="0 0 64 64"
        className="block shrink-0"
      >
        <circle
          cx="32"
          cy="32"
          r="25"
          fill="none"
          strokeWidth="6.5"
          className="stroke-mark-track"
        />
        <path
          d="M32.00 7.00 A25 25 0 1 1 7.44 27.32"
          fill="none"
          strokeWidth="6.5"
          strokeLinecap="round"
          className="stroke-accent"
        />
        <g transform="translate(32 33) scale(0.270) translate(0 60)">
          <path
            d="M-12,-108 v-6 a12,12 0 0 1 24,0 v6"
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-accent-pressed"
          />
          <rect x="-44" y="-108" width="88" height="108" rx="24" className="fill-accent" />
          <path
            d="M-44,-70 V-84 a24,24 0 0 1 24,-24 h40 a24,24 0 0 1 24,24 V-70 Q0,-58 -44,-70 Z"
            className="fill-accent-pressed"
          />
          <rect x="-6" y="-68" width="12" height="11" rx="3" className="fill-surface" />
          <rect x="-28" y="-48" width="56" height="36" rx="10" className="fill-mark-pocket" />
          <path
            d="M-28,-36 H28"
            strokeWidth="4"
            strokeLinecap="round"
            className="stroke-accent-pressed"
          />
        </g>
      </svg>
      <span aria-hidden="true" className={`${name} text-ink`}>
        PREPWISE
      </span>
    </span>
  );
}
