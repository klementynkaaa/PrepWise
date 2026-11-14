import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomSheet } from "./BottomSheet";
import { TabBar } from "./TabBar";
import { UndoBar } from "./UndoBar";

vi.mock("next/navigation", () => ({ usePathname: () => "/plan" }));

const tabs = [
  { href: "/", label: "Start", icon: "home" },
  { href: "/plan", label: "Plan", icon: "plan" },
  { href: "/lista", label: "Lista", icon: "list" },
  { href: "/dane", label: "Dane", icon: "lock" },
] as const;

describe("TabBar", () => {
  it("marks the current route as the current page", () => {
    render(<TabBar items={tabs} />);
    expect(screen.getByRole("navigation", { name: "Główna nawigacja" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Start" })).not.toHaveAttribute("aria-current");
  });

  it("accepts an explicit current route", () => {
    render(<TabBar items={tabs} currentHref="/" />);
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Plan" })).not.toHaveAttribute("aria-current");
  });
});

function SheetHarness({ onClose }: { onClose: () => void }) {
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
});

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
