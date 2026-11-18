import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinkPanel } from "./Panel";

describe("LinkPanel", () => {
  it("is one link named by its words", () => {
    render(
      <LinkPanel href="/pl/plan#section-pets">
        <span>Dla psa</span> <span>3 rzeczy</span>
      </LinkPanel>,
    );
    expect(screen.getByRole("link", { name: "Dla psa 3 rzeczy" })).toHaveAttribute(
      "href",
      "/pl/plan#section-pets",
    );
  });
});
