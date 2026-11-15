import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourcePill } from "./Pills";

describe("SourcePill", () => {
  it.each([
    ["official", "Oficjalne", "źródło: zalecenie oficjalne"],
    ["prepwise", "PREPWISE", "źródło: rekomendacja PREPWISE"],
  ] as const)("shows %s short and reads it in full", (source, short, spoken) => {
    const { container } = render(<SourcePill source={source} labels={{ short, spoken }} />);
    expect(screen.getByText(short)).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(spoken)).toHaveClass("sr-only");
    expect(container).toHaveTextContent(`${short}${spoken}`);
  });
});
