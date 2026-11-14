import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ChecklistRow } from "./ChecklistRow";
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

function ChecklistHarness({ initial }: { initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  return (
    <ChecklistRow name="Kup wodę pitną" detail="27 l" checked={checked} onChange={setChecked} />
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
