import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type Ref } from "react";
import { describe, expect, it, vi } from "vitest";
import { FactChip, PriorityHeader, SaveStatus } from "./Status";

const saveLabels = { saved: "Zapisane w telefonie", offline: "Offline · wszystko działa" };

describe("Status pills", () => {
  it("keeps SaveStatus as a live status", () => {
    render(<SaveStatus state="saved" labels={saveLabels} />);
    expect(screen.getByRole("status")).toHaveTextContent("Zapisane w telefonie");
  });

  it("renders FactChip as plain text without a status role", () => {
    render(<FactChip>Dane zostają w telefonie</FactChip>);
    expect(screen.getByText("Dane zostają w telefonie")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("PriorityHeader", () => {
  it("speaks the priority before the name and shows the count beside the heading", () => {
    render(
      <PriorityHeader tier={1} tierLabel="Priorytet 1" meta="4 rzeczy">
        Najważniejsze
      </PriorityHeader>,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "1Priorytet 1: Najważniejsze",
    );
    expect(screen.getByRole("heading", { level: 2 })).not.toHaveTextContent("4 rzeczy");
    expect(screen.getByText("4 rzeczy")).toBeInTheDocument();
  });

  it("has no number when there is no priority", () => {
    render(<PriorityHeader meta="3 rzeczy">Dla psa</PriorityHeader>);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/^Dla psa$/);
  });
});

describe("PriorityHeader with collapse", () => {
  function Folded({
    onToggle = () => {},
    expanded = false,
    ref,
  }: {
    onToggle?: () => void;
    expanded?: boolean;
    ref?: Ref<HTMLButtonElement>;
  }) {
    return (
      <PriorityHeader
        ref={ref}
        tier={1}
        tierLabel="Priorytet 1"
        meta="5 z 5"
        collapse={{ expanded, onToggle, controls: "rows-1" }}
      >
        Najważniejsze
      </PriorityHeader>
    );
  }

  it("keeps the heading and puts a disclosure button inside it", () => {
    render(<Folded />);
    const heading = screen.getByRole("heading", { level: 2 });
    const button = within(heading).getByRole("button", {
      name: /^Priorytet 1:\s*Najważniejsze 5 z 5$/,
    });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "rows-1");
  });

  it("calls onToggle and reports the expanded state", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<Folded onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<Folded onToggle={onToggle} expanded />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("forwards its ref to the button so focus can move to it", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Folded ref={ref} />);
    ref.current?.focus();
    expect(screen.getByRole("button")).toHaveFocus();
  });
});
