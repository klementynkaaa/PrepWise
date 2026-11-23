import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReadinessPanel, ReadinessRow } from "./ReadinessPanel";

const props = {
  done: 15,
  total: 45,
  percent: "33%",
  count: "Gotowe 15 z 45",
  note: "Dobrze idzie. Zostało 30 rzeczy.",
};

describe("ReadinessPanel", () => {
  it("shows the percentage in the ring, the count and the sentence, with no rows", () => {
    render(<ReadinessPanel {...props} />);
    expect(screen.getByText("33%")).toBeVisible();
    expect(screen.getByText("Gotowe 15 z 45")).toBeVisible();
    expect(screen.getByText("Dobrze idzie. Zostało 30 rzeczy.")).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows a check instead of the percentage once everything is done", () => {
    render(<ReadinessPanel {...props} done={45} percent="100%" />);
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
  });

  it("adds one link per row, named by its name and count, with decorative art and bar", () => {
    const { container } = render(
      <ReadinessPanel {...props}>
        <ReadinessRow
          href="/pl/list"
          illustration="item-food"
          name="Zapasy w domu"
          count="12 z 35"
          done={12}
          total={35}
        />
        <ReadinessRow
          href="/pl/list"
          illustration="item-backpack"
          name="Plecak ewakuacyjny"
          count="3 z 10"
          done={3}
          total={10}
        />
      </ReadinessPanel>,
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAccessibleName("Zapasy w domu 12 z 35");
    expect(links[1]).toHaveAttribute("href", "/pl/list");
    expect(within(links[1]).queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelectorAll('img[alt=""][aria-hidden="true"]')).toHaveLength(2);
  });
});
