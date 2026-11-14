import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChipGroup, ChipLink } from "./ChipGroup";
import { SegmentedControl } from "./SegmentedControl";

const days = [
  { value: "3", label: "72 h" },
  { value: "7", label: "7 dni" },
  { value: "14", label: "14 dni" },
] as const;

type Day = (typeof days)[number]["value"];

function SegmentHarness({ onChange }: { onChange?: (v: Day) => void }) {
  const [value, setValue] = useState<Day>("3");
  return (
    <SegmentedControl
      label="Na ile dni"
      options={days}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

function ChipHarness() {
  const [value, setValue] = useState<Day>("3");
  return (
    <ChipGroup
      label="Pokaż"
      options={days}
      value={value}
      onChange={setValue}
      after={<ChipLink href="/sytuacje">+ Dodaj sytuację</ChipLink>}
    />
  );
}

describe.each([
  ["SegmentedControl", "Na ile dni", () => render(<SegmentHarness />)],
  ["ChipGroup", "Pokaż", () => render(<ChipHarness />)],
])("%s", (_name, groupName, setup) => {
  it("is a radiogroup where only the checked radio is tabbable", () => {
    setup();
    expect(screen.getByRole("radiogroup", { name: groupName })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    expect(screen.getByRole("radio", { name: "72 h" })).toHaveAttribute("aria-checked", "true");
  });

  it("moves selection and focus with arrow keys, wrapping around", async () => {
    setup();
    await userEvent.tab();
    expect(screen.getByRole("radio", { name: "72 h" })).toHaveFocus();

    await userEvent.keyboard("{ArrowRight}");
    const seven = screen.getByRole("radio", { name: "7 dni" });
    expect(seven).toHaveFocus();
    expect(seven).toHaveAttribute("aria-checked", "true");
    expect(seven).toHaveAttribute("tabindex", "0");

    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "14 dni" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "14 dni" })).toHaveAttribute("aria-checked", "true");

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "72 h" })).toHaveFocus();
  });

  it("selects with a click", async () => {
    setup();
    await userEvent.click(screen.getByRole("radio", { name: "14 dni" }));
    expect(screen.getByRole("radio", { name: "14 dni" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "72 h" })).toHaveAttribute("aria-checked", "false");
  });
});

describe("SegmentedControl onChange", () => {
  it("receives the new value", async () => {
    const onChange = vi.fn();
    render(<SegmentHarness onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "7 dni" }));
    expect(onChange).toHaveBeenCalledWith("7");
  });
});

describe("ChipGroup trailing link", () => {
  it("sits outside the radiogroup", () => {
    render(<ChipHarness />);
    const link = screen.getByRole("link", { name: "+ Dodaj sytuację" });
    expect(screen.getByRole("radiogroup")).not.toContainElement(link);
  });
});
