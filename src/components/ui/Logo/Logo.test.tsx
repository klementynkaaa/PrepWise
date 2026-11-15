import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./Logo";

describe("Logo", () => {
  it.each([undefined, "sm", "lg"] as const)("has one accessible name at size %s", (size) => {
    const { container } = render(<Logo size={size} />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "PREPWISE" })).toBeInTheDocument();
    // The mark and the visible name are hidden, so nothing reads twice.
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("draws the mark at 20 px for sm and 40 px for lg", () => {
    const { container, rerender } = render(<Logo size="sm" />);
    expect(container.querySelector("svg")).toHaveAttribute("width", "20");
    rerender(<Logo size="lg" />);
    expect(container.querySelector("svg")).toHaveAttribute("width", "40");
  });
});
