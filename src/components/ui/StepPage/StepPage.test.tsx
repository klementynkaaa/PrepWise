import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StepPage } from "./StepPage";

const props = {
  backHref: "/",
  backLabel: "Wstecz",
  stepLabel: "Krok 1 z 4",
  title: "Kto mieszka z Tobą?",
  primaryLabel: "Dalej",
  children: <p>Treść</p>,
};

describe("StepPage", () => {
  it("lays out back link, step, title, content and main action", () => {
    render(<StepPage {...props} lead="Opis" summary="Razem: 9 osób" onPrimary={() => {}} />);
    expect(screen.getByRole("link", { name: /Wstecz/ })).toHaveAttribute("href", "/");
    expect(screen.getByText("Krok 1 z 4")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Kto mieszka z Tobą?" })).toBeVisible();
    expect(screen.getByText("Opis")).toBeInTheDocument();
    expect(screen.getByText("Treść")).toBeInTheDocument();
    expect(screen.getByText("Razem: 9 osób")).toBeInTheDocument();
  });

  it("calls onPrimary", async () => {
    const onPrimary = vi.fn();
    render(<StepPage {...props} onPrimary={onPrimary} />);
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it("does not call onPrimary while unavailable, and says why", async () => {
    const onPrimary = vi.fn();
    render(<StepPage {...props} onPrimary={onPrimary} disabledReason="Wybierz opcję." />);
    const button = screen.getByRole("button", { name: "Dalej" });
    expect(button).toHaveAccessibleDescription("Wybierz opcję.");
    await userEvent.click(button);
    expect(onPrimary).not.toHaveBeenCalled();
  });
});
