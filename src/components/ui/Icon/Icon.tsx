import type { ReactNode } from "react";

// Line icons: 2px stroke, rounded caps, drawn on a 24 grid. Only for
// navigation and controls — never on list rows. Always decorative
// (aria-hidden): the control around an icon carries the accessible name.

export type IconName =
  | "home"
  | "plan"
  | "list"
  | "lock"
  | "info"
  | "offline"
  | "back"
  | "plus"
  | "minus"
  | "check"
  | "close";

const paths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </>
  ),
  plan: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3h6v3H9z" />
      <path d="M9 11h6M9 15h4" />
    </>
  ),
  list: (
    <>
      <path d="M4 6l2 2 3-3" />
      <path d="M4 13l2 2 3-3" />
      <path d="M12 7h8M12 14h8M4 20h16" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  offline: (
    <>
      <path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0" />
      <path d="M3 3l18 18" />
    </>
  ),
  back: <path d="M15 18l-6-6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
};

type IconProps = {
  name: IconName;
  /** "md" is 20px (controls, notices), "lg" is 24px (tab bar). */
  size?: "md" | "lg";
};

export function Icon({ name, size = "md" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={size === "lg" ? "size-6 shrink-0" : "size-5 shrink-0"}
    >
      {paths[name]}
    </svg>
  );
}
