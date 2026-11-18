import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonGroup } from "./Skeleton";

describe("Skeleton", () => {
  it("announces the label once and hides every block from screen readers", () => {
    const { container } = render(
      <SkeletonGroup label="Wczytywanie…">
        <Skeleton shape="banner" />
        <Skeleton />
        <Skeleton shape="block" />
      </SkeletonGroup>,
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Wczytywanie…");
    expect(screen.getByRole("status")).toHaveClass("sr-only");
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    const blocks = container.querySelectorAll("[aria-hidden='true']");
    expect(blocks).toHaveLength(3);
  });
});
