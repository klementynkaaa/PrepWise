import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { OptionGroup } from "../OptionGroup";
import { OptionRadio } from "./OptionRadio";

function Harness() {
  const [value, setValue] = useState("");
  return (
    <OptionGroup legend="Gdzie mieszkasz?">
      <OptionRadio
        name="housing"
        value="flat"
        label="Mieszkanie"
        description="W bloku."
        checked={value === "flat"}
        onChange={setValue}
      />
      <OptionRadio
        name="housing"
        value="house"
        label="Dom"
        checked={value === "house"}
        onChange={setValue}
      />
    </OptionGroup>
  );
}

describe("OptionRadio", () => {
  it("is described by its description", () => {
    render(<Harness />);
    expect(screen.getByRole("radio", { name: /Mieszkanie/ })).toHaveAccessibleDescription(
      "W bloku.",
    );
    expect(screen.getByRole("radio", { name: /Dom/ })).not.toHaveAccessibleDescription();
  });

  it("selects with a click", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("radio", { name: /Dom/ }));
    expect(screen.getByRole("radio", { name: /Dom/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Mieszkanie/ })).not.toBeChecked();
  });

  it("moves the selection with the arrow keys inside the group", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("radio", { name: /Mieszkanie/ }));
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: /Dom/ })).toBeChecked();
    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getByRole("radio", { name: /Mieszkanie/ })).toBeChecked();
  });
});
