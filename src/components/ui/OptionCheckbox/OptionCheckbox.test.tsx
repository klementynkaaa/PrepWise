import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { OptionCheckbox } from "./OptionCheckbox";

function OptionHarness({
  details,
}: {
  details?: ComponentProps<typeof OptionCheckbox>["details"];
}) {
  const [checked, setChecked] = useState(false);
  return (
    <OptionCheckbox
      label="Brak prądu (blackout)"
      description="Prądu nie ma kilka dni."
      checkedNote="Dodamy: latarki, baterie, powerbank, radio na baterie."
      checked={checked}
      onChange={setChecked}
      details={details}
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

  it("opens its details without toggling the checkbox", async () => {
    render(
      <OptionHarness
        details={{
          openLabel: "Co dodaje?",
          closeLabel: "Zwiń",
          content: <p>Latarka, powerbank.</p>,
        }}
      />,
    );
    const box = screen.getByRole("checkbox", { name: /Brak prądu/ });
    const button = screen.getByRole("button", { name: "Co dodaje?" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Latarka, powerbank.")).not.toBeVisible();

    await userEvent.click(button);
    expect(box).not.toBeChecked();
    const close = screen.getByRole("button", { name: "Zwiń" });
    expect(close).toHaveAttribute("aria-expanded", "true");
    expect(close).toHaveAttribute(
      "aria-controls",
      screen.getByText("Latarka, powerbank.").parentElement?.id,
    );
    expect(screen.getByText("Latarka, powerbank.")).toBeVisible();

    await userEvent.click(close);
    expect(screen.getByRole("button", { name: "Co dodaje?" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(box).not.toBeChecked();
  });
});
