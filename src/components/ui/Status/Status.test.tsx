import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FactChip, PriorityHeader, SaveStatus } from "./Status";

const saveLabels = { saved: "Zapisane w telefonie", offline: "Offline · wszystko działa" };

describe("Status pills", () => {
  it("keeps SaveStatus as a live status", () => {
    render(<SaveStatus state="saved" labels={saveLabels} />);
    expect(screen.getByRole("status")).toHaveTextContent("Zapisane w telefonie");
  });

  it("renders FactChip as plain text without a status role", () => {
    render(<FactChip>Dane zostają w telefonie</FactChip>);
    expect(screen.getByText("Dane zostają w telefonie")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("PriorityHeader", () => {
  it("speaks the priority before the name and shows the count beside the heading", () => {
    render(
      <PriorityHeader tier={1} tierLabel="Priorytet 1" meta="4 rzeczy">
        Najważniejsze
      </PriorityHeader>,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "1Priorytet 1: Najważniejsze",
    );
    expect(screen.getByRole("heading", { level: 2 })).not.toHaveTextContent("4 rzeczy");
    expect(screen.getByText("4 rzeczy")).toBeInTheDocument();
  });

  it("has no number when there is no priority", () => {
    render(<PriorityHeader meta="3 rzeczy">Dla psa</PriorityHeader>);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/^Dla psa$/);
  });
});
