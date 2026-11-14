import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { OptionCheckbox } from "./OptionCheckbox";

function OptionHarness() {
  const [checked, setChecked] = useState(false);
  return (
    <OptionCheckbox
      label="Brak prądu (blackout)"
      description="Prądu nie ma kilka dni."
      checkedNote="Dodamy: latarki, baterie, powerbank, radio na baterie."
      checked={checked}
      onChange={setChecked}
    />
  );
}

describe("OptionCheckbox", () => {
  it("shows what it adds only once checked", async () => {
    render(<OptionHarness />);
    const box = screen.getByRole("checkbox", { name: /Brak prądu/ });
    expect(screen.queryByText(/Dodamy:/)).not.toBeInTheDocument();
    expect(box).toHaveAccessibleDescription("Prądu nie ma kilka dni.");

    await userEvent.click(box);
    expect(box).toBeChecked();
    expect(screen.getByText(/Dodamy:/)).toBeInTheDocument();
    expect(box).toHaveAccessibleDescription(
      "Prądu nie ma kilka dni. Dodamy: latarki, baterie, powerbank, radio na baterie.",
    );
  });
});
