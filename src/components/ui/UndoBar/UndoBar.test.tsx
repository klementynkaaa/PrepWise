import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UndoBar } from "./UndoBar";

describe("UndoBar", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onUndo from Cofnij", async () => {
    const onUndo = vi.fn();
    render(<UndoBar message="Odznaczono: Kup wodę pitną" onUndo={onUndo} />);
    expect(screen.getByRole("status")).toHaveTextContent("Odznaczono: Kup wodę pitną");
    await userEvent.click(screen.getByRole("button", { name: "Cofnij" }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("does not disappear on its own", () => {
    vi.useFakeTimers();
    render(<UndoBar message="Odznaczono: Kup wodę pitną" onUndo={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("button", { name: "Cofnij" })).toBeInTheDocument();
  });
});
