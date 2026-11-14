import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("calls onClick when available", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Wygeneruj plan</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Wygeneruj plan" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("stays focusable and explains itself when unavailable", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabledReason="Dodaj co najmniej jedną osobę, żeby przejść dalej.">
        Dalej
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Dalej" });

    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(button).toHaveAccessibleDescription(
      "Dodaj co najmniej jedną osobę, żeby przejść dalej.",
    );

    await userEvent.tab();
    expect(button).toHaveFocus();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("never submits a form while unavailable", () => {
    render(
      <Button type="submit" disabledReason="Uzupełnij dane.">
        Zapisz
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Zapisz" })).toHaveAttribute("type", "button");
  });
});
