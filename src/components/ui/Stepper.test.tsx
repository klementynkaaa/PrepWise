import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Stepper } from "./Stepper";

function Harness({ initial, max, error }: { initial: number; max?: number; error?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <Stepper
      label="Dorośli"
      hint="18–64 lata"
      value={value}
      max={max}
      onChange={setValue}
      error={error}
      decreaseLabel="Mniej dorosłych"
      increaseLabel="Więcej dorosłych"
    />
  );
}

const value = () => screen.getByRole("group", { name: "Dorośli" }).querySelector("[aria-live]");

describe("Stepper", () => {
  it("increments and decrements", async () => {
    render(<Harness initial={2} />);
    await userEvent.click(screen.getByRole("button", { name: "Więcej dorosłych" }));
    expect(value()).toHaveTextContent("3");
    await userEvent.click(screen.getByRole("button", { name: "Mniej dorosłych" }));
    await userEvent.click(screen.getByRole("button", { name: "Mniej dorosłych" }));
    expect(value()).toHaveTextContent("1");
  });

  it("stops at the minimum and marks minus unavailable", async () => {
    render(<Harness initial={0} />);
    const minus = screen.getByRole("button", { name: "Mniej dorosłych" });
    expect(minus).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(minus);
    expect(value()).toHaveTextContent("0");
  });

  it("stops at the maximum", async () => {
    render(<Harness initial={9} max={9} />);
    const plus = screen.getByRole("button", { name: "Więcej dorosłych" });
    expect(plus).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(plus);
    expect(value()).toHaveTextContent("9");
  });

  it("ties the error to the group and its buttons", () => {
    render(<Harness initial={0} error="Dodaj co najmniej jedną osobę, żeby policzyć zapasy." />);
    const message = "Dodaj co najmniej jedną osobę, żeby policzyć zapasy.";
    expect(screen.getByRole("group", { name: "Dorośli" })).toHaveAccessibleDescription(message);
    expect(screen.getByRole("button", { name: "Więcej dorosłych" })).toHaveAccessibleDescription(
      message,
    );
  });

  it("falls back to generic Polish button names", () => {
    render(<Stepper label="Psy" value={1} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Zmniejsz: Psy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zwiększ: Psy" })).toBeInTheDocument();
  });
});
