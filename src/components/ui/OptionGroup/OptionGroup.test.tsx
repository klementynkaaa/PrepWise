import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OptionCheckbox } from "../OptionCheckbox";
import { OptionGroup } from "./OptionGroup";

describe("OptionGroup", () => {
  it("names the group by its legend", () => {
    render(
      <OptionGroup legend="Potrzeby">
        <OptionCheckbox label="Dieta" checked={false} onChange={() => {}} />
      </OptionGroup>,
    );
    expect(screen.getByRole("group", { name: "Potrzeby" })).toBeInTheDocument();
  });

  it("keeps the name for screen readers when the legend is hidden", () => {
    render(
      <OptionGroup legend="Potrzeby" hideLegend>
        <OptionCheckbox label="Dieta" checked={false} onChange={() => {}} />
      </OptionGroup>,
    );
    expect(screen.getByRole("group", { name: "Potrzeby" })).toBeInTheDocument();
    expect(screen.getByText("Potrzeby")).toHaveClass("sr-only");
  });
});
