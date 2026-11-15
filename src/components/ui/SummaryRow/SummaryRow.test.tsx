import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SummaryRow } from "./SummaryRow";

describe("SummaryRow", () => {
  it("shows the label and value and links to the step", () => {
    render(
      <SummaryRow
        label="Domownicy"
        value="4 osoby"
        action={{ href: "/start/people", label: "Zmień", ariaLabel: "Zmień: Domownicy" }}
      />,
    );
    expect(screen.getByText("Domownicy")).toBeInTheDocument();
    expect(screen.getByText("4 osoby")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Zmień: Domownicy" });
    expect(link).toHaveAttribute("href", "/start/people");
  });

  it("uses the visible label as the link name by default", () => {
    render(<SummaryRow label="Zwierzęta" value="Brak" action={{ href: "/x", label: "Zmień" }} />);
    expect(screen.getByRole("link", { name: "Zmień" })).toBeInTheDocument();
  });
});
