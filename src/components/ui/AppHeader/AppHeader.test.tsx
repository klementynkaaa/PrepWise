import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppHeader } from "./AppHeader";

const saveLabels = { saved: "Zapisane w telefonie", offline: "Offline · wszystko działa" };

describe("AppHeader", () => {
  it("shows the logo and the save status", () => {
    render(<AppHeader saveState="saved" saveLabels={saveLabels} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "PREPWISE" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Zapisane w telefonie");
  });

  it("shows the offline state", () => {
    render(<AppHeader saveState="offline" saveLabels={saveLabels} />);
    expect(screen.getByRole("status")).toHaveTextContent("Offline");
  });

  it("shows only the logo without a save state", () => {
    render(<AppHeader saveLabels={saveLabels} />);
    expect(screen.getByRole("img", { name: "PREPWISE" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
