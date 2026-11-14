import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";
import { SourcePill } from "./Pills";
import { ProgressBarRow, ProgressRing } from "./Progress";

describe("SourcePill", () => {
  it.each([
    ["official", "Oficjalne", "źródło: zalecenie oficjalne"],
    ["prepwise", "PREPWISE", "źródło: rekomendacja PREPWISE"],
  ] as const)("shows %s short and reads it in full", (source, short, spoken) => {
    const { container } = render(<SourcePill source={source} />);
    expect(screen.getByText(short)).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(spoken)).toHaveClass("sr-only");
    expect(container).toHaveTextContent(`${short}${spoken}`);
  });
});

describe("ProgressRing", () => {
  it("renders its label as one text node and is read in words", () => {
    render(<ProgressRing done={12} total={38} />);
    const label = screen.getByText("12/38");
    expect(label.childNodes).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Gotowe 12 z 38" })).toBeInTheDocument();
  });
});

describe("ProgressBarRow", () => {
  it("always shows the count, with the percentage beside it", () => {
    render(<ProgressBarRow name="Woda i jedzenie" detail="brakuje wody" done={4} total={7} />);
    expect(screen.getByText(/4 z 7/)).toHaveTextContent("4 z 7 · brakuje wody");
    expect(screen.getByText("57%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Gotowe 4 z 7" })).toBeInTheDocument();
  });

  it("shows Gotowe instead of 100%", () => {
    render(<ProgressBarRow name="Ciepło" done={3} total={3} />);
    expect(screen.getByText("Gotowe")).toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
    expect(screen.getByText("3 z 3")).toBeInTheDocument();
  });
});

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
});
