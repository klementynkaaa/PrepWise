import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { BottomSheet } from "./BottomSheet";

function SheetHarness({ onClose, footer }: { onClose: () => void; footer?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Otwórz
      </button>
      <BottomSheet
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        title="Na 7 dni"
        closeLabel="Zamknij"
        footer={footer}
      >
        <p>Ilości wzrosną.</p>
      </BottomSheet>
    </>
  );
}

describe("BottomSheet", () => {
  it("opens as a modal dialog and closes on Escape", async () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    const onClose = vi.fn();
    render(<SheetHarness onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Otwórz" }));
    expect(showModal).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole("dialog", { name: "Na 7 dni" });
    expect(dialog).toHaveAttribute("open");

    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialog).not.toHaveAttribute("open");
    showModal.mockRestore();
  });

  it("closes from its close button", async () => {
    const onClose = vi.fn();
    render(<SheetHarness onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Otwórz" }));
    await userEvent.click(screen.getByRole("button", { name: "Zamknij" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a footer outside the scrolling body", async () => {
    render(<SheetHarness onClose={vi.fn()} footer={<button type="button">Gotowe</button>} />);
    await userEvent.click(screen.getByRole("button", { name: "Otwórz" }));
    const dialog = screen.getByRole("dialog", { name: "Na 7 dni" });
    const done = screen.getByRole("button", { name: "Gotowe" });
    expect(dialog).toContainElement(done);
    expect(done.parentElement).toHaveClass("border-t");
    expect(screen.getByText("Ilości wzrosną.").parentElement).not.toContainElement(done);
  });

  it("renders no footer area without one", async () => {
    render(<SheetHarness onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Otwórz" }));
    expect(screen.getByRole("dialog").querySelector(".border-t")).toBeNull();
  });
});
