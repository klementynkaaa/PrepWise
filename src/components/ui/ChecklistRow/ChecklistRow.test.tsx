import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChecklistRow } from "./ChecklistRow";

function ChecklistHarness({
  initial,
  onChange,
}: {
  initial: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const [checked, setChecked] = useState(initial);
  return (
    <ChecklistRow
      name="Woda"
      detail="3 l × 3 osoby × 3 dni"
      quantity="27 l"
      checked={checked}
      onChange={(next) => {
        onChange?.(next);
        setChecked(next);
      }}
    />
  );
}

describe("ChecklistRow", () => {
  it("names the checkbox after the item and describes it with the detail and quantity", () => {
    render(<ChecklistHarness initial={false} />);
    const box = screen.getByRole("checkbox", { name: "Woda" });
    expect(box).not.toBeChecked();
    expect(box).toHaveAccessibleDescription("3 l × 3 osoby × 3 dni 27 l");
    expect(screen.getByText("27 l")).toBeVisible();
  });

  it("calls onChange when toggled, both ways", async () => {
    const onChange = vi.fn();
    render(<ChecklistHarness initial={false} onChange={onChange} />);
    const box = screen.getByRole("checkbox", { name: "Woda" });
    await userEvent.click(box);
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(box).toBeChecked();
    await userEvent.click(screen.getByText("27 l"));
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(box).not.toBeChecked();
  });

  it("keeps the quantity when ticked, with no Mam and no strike-through", () => {
    render(<ChecklistHarness initial />);
    expect(screen.getByRole("checkbox", { name: "Woda" })).toBeChecked();
    expect(screen.getByText("27 l")).toBeVisible();
    expect(screen.queryByText("Mam")).not.toBeInTheDocument();
    const label = screen.getByText("Woda").closest("label");
    expect(label?.className ?? "").not.toMatch(/line-through/);
  });

  it("shows the first label and reads it before the detail", () => {
    render(
      <ChecklistRow
        name="Woda"
        quantity="27 l"
        checked={false}
        onChange={() => {}}
        first={{ label: "Najpierw" }}
      />,
    );
    expect(screen.getByText("Najpierw")).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "Woda" })).toHaveAccessibleDescription(
      "Najpierw 27 l",
    );
  });
});
