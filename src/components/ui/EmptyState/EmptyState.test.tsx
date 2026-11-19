import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("looks the same as a page heading (h1) and as a section heading (h2)", () => {
    render(
      <>
        <EmptyState illustration="offline" title="Ekran" headingLevel={1}>
          Tekst.
        </EmptyState>
        <EmptyState illustration="empty-kit" title="Sekcja">
          Tekst.
        </EmptyState>
      </>,
    );
    const page = screen.getByRole("heading", { level: 1, name: "Ekran" });
    const section = screen.getByRole("heading", { level: 2, name: "Sekcja" });
    expect(page.className).toBe(section.className);
  });

  it("leaves the sentence out when there is none", () => {
    const { container } = render(<EmptyState illustration="storage-error" title="Tytuł" />);
    expect(screen.getByRole("heading", { name: "Tytuł" })).toBeInTheDocument();
    expect(container.querySelector("p")).toBeNull();
  });
});
