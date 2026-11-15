import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FactChip, SaveStatus } from "./Status";

describe("Status pills", () => {
  it("keeps SaveStatus as a live status", () => {
    render(<SaveStatus state="saved" />);
    expect(screen.getByRole("status")).toHaveTextContent("Zapisane w telefonie");
  });

  it("renders FactChip as plain text without a status role", () => {
    render(<FactChip>Dane zostają w telefonie</FactChip>);
    expect(screen.getByText("Dane zostają w telefonie")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
