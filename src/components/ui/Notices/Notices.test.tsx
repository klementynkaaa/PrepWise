import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiveStatus, Notice } from "./Notices";

describe("Notice", () => {
  it("is a polite status by default", () => {
    render(<Notice>Plan się zmienił.</Notice>);
    expect(screen.getByRole("status")).toHaveTextContent("Plan się zmienił.");
  });

  it("is not a live region when the screen announces it through LiveStatus", () => {
    render(<Notice live={false}>Nie udało się zapisać.</Notice>);
    expect(screen.getByText("Nie udało się zapisać.")).toBeVisible();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("LiveStatus", () => {
  it("is present and empty before anything happens, then carries the words", () => {
    const { rerender } = render(<LiveStatus>{null}</LiveStatus>);
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("");
    expect(region).toHaveClass("sr-only");

    rerender(<LiveStatus>Nie udało się zapisać.</LiveStatus>);
    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent("Nie udało się zapisać.");
  });
});
