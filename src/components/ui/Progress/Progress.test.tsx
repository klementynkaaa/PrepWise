import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBarRow, ProgressRing } from "./Progress";

describe("ProgressRing", () => {
  it("renders its fraction as one text node and is read as its label", () => {
    render(<ProgressRing done={12} total={38} label="Gotowe 12 z 38" fraction="12/38" />);
    const fraction = screen.getByText("12/38");
    expect(fraction.childNodes).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Gotowe 12 z 38" })).toBeInTheDocument();
  });
});

describe("ProgressBarRow", () => {
  it("always shows the count, with the percentage beside it", () => {
    render(
      <ProgressBarRow
        name="Woda i jedzenie"
        detail="brakuje wody"
        count="4 z 7"
        label="Gotowe 4 z 7"
        done={4}
        total={7}
      />,
    );
    expect(screen.getByText(/4 z 7/)).toHaveTextContent("4 z 7 · brakuje wody");
    expect(screen.getByText("57%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Gotowe 4 z 7" })).toBeInTheDocument();
  });

  it("shows Gotowe instead of 100%", () => {
    render(<ProgressBarRow name="Ciepło" count="3 z 3" label="Gotowe 3 z 3" done={3} total={3} />);
    expect(screen.getByText("Gotowe")).toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
    expect(screen.getByText("3 z 3")).toBeInTheDocument();
  });
});
