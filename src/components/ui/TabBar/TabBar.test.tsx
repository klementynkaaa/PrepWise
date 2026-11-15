import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TabBar } from "./TabBar";

vi.mock("next/navigation", () => ({ usePathname: () => "/plan" }));

const label = "Główna nawigacja";
const tabs = [
  { href: "/", label: "Start", icon: "home" },
  { href: "/plan", label: "Plan", icon: "plan" },
  { href: "/lista", label: "Lista", icon: "list" },
  { href: "/dane", label: "Dane", icon: "lock" },
] as const;

describe("TabBar", () => {
  it("marks the current route as the current page", () => {
    render(<TabBar label={label} items={tabs} />);
    expect(screen.getByRole("navigation", { name: "Główna nawigacja" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Start" })).not.toHaveAttribute("aria-current");
  });

  it("accepts an explicit current route", () => {
    render(<TabBar label={label} items={tabs} currentHref="/" />);
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Plan" })).not.toHaveAttribute("aria-current");
  });

  it("keeps aria-current only on the current tab", () => {
    render(<TabBar label={label} items={tabs} />);
    const links = screen.getAllByRole("link");
    const current = links.filter((l) => l.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Plan");
    for (const link of links.filter((l) => l !== current[0])) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });
});
