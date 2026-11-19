import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressPanel } from "./ProgressPanel";

const props = {
  count: "Gotowe 7 z 22",
  left: "Zostało 15 rzeczy do odhaczenia.",
  done: 7,
  total: 22,
  barLabel: "Gotowe 7 z 22",
};

describe("ProgressPanel", () => {
  it("shows the count, one bar and what is left", () => {
    render(<ProgressPanel {...props} />);
    expect(screen.getByText("Gotowe 7 z 22")).toBeVisible();
    expect(screen.getAllByRole("img", { name: "Gotowe 7 z 22" })).toHaveLength(1);
    expect(screen.getByText("Zostało 15 rzeczy do odhaczenia.")).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("becomes one link with a heading when given a title and href", () => {
    render(<ProgressPanel {...props} title="Gotowość na 72 godziny" href="/pl/list" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/pl/list");
    // The link is named by its words; the bar adds nothing to that name.
    expect(link).toHaveAccessibleName(
      "Gotowość na 72 godziny Gotowe 7 z 22 Zostało 15 rzeczy do odhaczenia.",
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gotowość na 72 godziny" })).toBeInTheDocument();
  });

  it("shows a large ring with the short count instead of the bar", () => {
    render(
      <ProgressPanel {...props} barLabel="Postęp listy zakupów" ring={{ fraction: "7/22" }} />,
    );
    expect(screen.getByRole("img", { name: "Postęp listy zakupów" }).tagName).toBe("svg");
    expect(screen.getByText("7/22")).toBeInTheDocument();
    expect(screen.getByText("Gotowe 7 z 22")).toBeVisible();
    expect(screen.getByText("Zostało 15 rzeczy do odhaczenia.")).toBeVisible();
  });

  it("keeps the ring out of the link's name when the ring panel is a link", () => {
    render(
      <ProgressPanel
        {...props}
        barLabel="Postęp listy zakupów"
        ring={{ fraction: "7/22" }}
        href="/pl/list"
      />,
    );
    expect(screen.getByRole("link")).toHaveAccessibleName(
      "Gotowe 7 z 22 Zostało 15 rzeczy do odhaczenia.",
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
