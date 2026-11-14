import Link from "next/link";
import { useId, type MouseEvent, type ReactNode } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "neutral" | "destructive";
export type ButtonSize = "full" | "small";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full text-center no-underline select-none";

const sizes: Record<ButtonSize, string> = {
  // The screen's one main action: full width, 54px.
  full: "min-h-button w-full px-6 py-3 text-button",
  // Inside cards: 44px.
  small: "min-h-touch px-5 py-2 text-control font-bold",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent active:bg-accent-pressed",
  secondary: "bg-surface text-accent inset-ring-strong inset-ring-accent active:bg-accent-tint",
  // "Anuluj" next to a destructive action.
  neutral:
    "bg-surface text-ink inset-ring-strong inset-ring-control-border active:bg-surface-sunken",
  // Only inside the confirmation of an irreversible action, next to "Anuluj".
  destructive: "bg-error text-on-accent",
};

const unavailable = "cursor-not-allowed bg-disabled-bg text-disabled-ink";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "button" | "submit";
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /**
   * Makes the button unavailable and says why. The reason is shown above the
   * button and read as its description; the button stays focusable
   * (aria-disabled, not disabled), so a screen reader still finds it.
   */
  disabledReason?: string;
};

export function Button({
  children,
  variant = "primary",
  size = "full",
  type = "button",
  onClick,
  disabledReason,
}: ButtonProps) {
  const reasonId = useId();
  const unavailableNow = disabledReason !== undefined;

  const button = (
    <button
      // An unavailable button never submits a form.
      type={unavailableNow ? "button" : type}
      aria-disabled={unavailableNow || undefined}
      aria-describedby={unavailableNow ? reasonId : undefined}
      // Only attach a handler when the caller passed one: a server-rendered
      // button can't carry a function.
      onClick={
        onClick
          ? (event) => {
              if (unavailableNow) {
                event.preventDefault();
                return;
              }
              onClick(event);
            }
          : undefined
      }
      className={cn(base, sizes[size], unavailableNow ? unavailable : variants[variant])}
    >
      {children}
    </button>
  );

  if (!unavailableNow) return button;

  return (
    <div className={cn("flex flex-col gap-2", size === "full" && "w-full")}>
      <p id={reasonId} className="text-center text-body-sm text-ink-muted">
        {disabledReason}
      </p>
      {button}
    </div>
  );
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: Exclude<ButtonVariant, "destructive">;
  size?: ButtonSize;
};

/** A link that looks like a button, for navigation ("Otwórz listę"). */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "full",
}: ButtonLinkProps) {
  return (
    <Link href={href} className={cn(base, sizes[size], variants[variant])}>
      {children}
    </Link>
  );
}
