import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonGroup } from "./Skeleton";

describe("Skeleton", () => {
  it("announces the label once, after mount, and hides every block from screen readers", async () => {
    const { container } = render(
      <SkeletonGroup label="Wczytywanie…">
        <Skeleton shape="banner" />
        <Skeleton />
        <Skeleton shape="block" />
      </SkeletonGroup>,
    );
    // The status region starts empty so the label is read when it arrives.
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(await screen.findByText("Wczytywanie…")).toBe(screen.getByRole("status"));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveClass("sr-only");
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    const blocks = container.querySelectorAll("[aria-hidden='true']");
    expect(blocks).toHaveLength(3);
  });

  it("leaves aria-busy to an outer container when busy is off", async () => {
    const { container } = render(
      <SkeletonGroup label="Wczytywanie…" busy={false}>
        <Skeleton />
      </SkeletonGroup>,
    );
    expect(await screen.findByText("Wczytywanie…")).toHaveAttribute("role", "status");
    expect(container.firstElementChild).not.toHaveAttribute("aria-busy");
  });
});
