import type { ReactNode } from "react";
import { cn } from "../_shared/cn";

type OptionGroupProps = {
  /** Names the group for a screen reader, e.g. "Gdzie mieszkasz?". */
  legend: ReactNode;
  /** Hide the legend visually when the page title already says it. */
  hideLegend?: boolean;
  children: ReactNode;
};

/** A group of option cards (radios or checkboxes) announced as one set. */
export function OptionGroup({ legend, hideLegend = false, children }: OptionGroupProps) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className={cn("p-0 text-body-strong", hideLegend ? "sr-only" : "mb-3")}>
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}
