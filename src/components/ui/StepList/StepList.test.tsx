import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Step, StepList } from "./StepList";

describe("StepList", () => {
  it("is an ordered list with a visually hidden status word per step", () => {
    render(
      <StepList>
        <Step state="done" statusLabel="zrobione" name="Plan gotowy" caption="Policzony." />
        <Step
          state="current"
          statusLabel="teraz"
          name="Skompletuj zapasy"
          caption="Zostało 23 rzeczy."
          action={<button type="button">Otwórz listę zakupów</button>}
        />
        <Step state="later" statusLabel="później" name="Spakuj plecak" caption="10 rzeczy." />
      </StepList>,
    );
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Plan gotowy");
    expect(within(items[0]).getByText("zrobione")).toHaveClass("sr-only");
    expect(within(items[1]).getByText("teraz")).toHaveClass("sr-only");
    expect(within(items[2]).getByText("później")).toHaveClass("sr-only");
  });

  it("gives only the current step an action", () => {
    render(
      <StepList>
        <Step state="done" statusLabel="zrobione" name="Plan gotowy" caption="Policzony." />
        <Step
          state="current"
          statusLabel="teraz"
          name="Skompletuj zapasy"
          caption="Zostało 23 rzeczy."
          action={<button type="button">Otwórz listę zakupów</button>}
        />
      </StepList>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Otwórz listę zakupów" })).toBeVisible();
  });
});
