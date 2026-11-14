import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ChecklistRow } from "./ChecklistRow";

function ChecklistHarness({ initial }: { initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  return (
    <ChecklistRow name="Kup wodę pitną" detail="27 l" checked={checked} onChange={setChecked} />
  );
}

describe("ChecklistRow", () => {
  it("names the checkbox after the item", () => {
    render(<ChecklistHarness initial={false} />);
    expect(screen.getByRole("checkbox", { name: /Kup wodę pitną/ })).not.toBeChecked();
    expect(screen.queryByText("Mam")).not.toBeInTheDocument();
  });

  it("shows the word Mam when done, never strikes the name through", async () => {
    render(<ChecklistHarness initial={false} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Kup wodę pitną/ }));
    expect(screen.getByRole("checkbox", { name: /Kup wodę pitną/ })).toBeChecked();
    expect(screen.getByText("Mam")).toBeInTheDocument();
    const name = screen.getByText("Kup wodę pitną");
    expect(name.className).not.toMatch(/line-through/);
    expect(name.closest("label")?.className ?? "").not.toMatch(/line-through/);
  });
});
