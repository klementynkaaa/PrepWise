import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { TextButton, TextLink } from "./TextLink";

describe("TextLink", () => {
  it("renders a link, also to an in-page anchor", () => {
    render(
      <TextLink href="#section-pets" size="caption">
        w sekcji „Dla psa” niżej
      </TextLink>,
    );
    expect(screen.getByRole("link", { name: "w sekcji „Dla psa” niżej" })).toHaveAttribute(
      "href",
      "#section-pets",
    );
  });
});

describe("TextButton", () => {
  it("is a plain button that says it opens a dialog", () => {
    render(
      <TextButton aria-haspopup="dialog" onClick={() => {}}>
        Skąd te ilości?
      </TextButton>,
    );
    const button = screen.getByRole("button", { name: "Skąd te ilości?" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("fires onClick", async () => {
    const onClick = vi.fn();
    render(<TextButton onClick={onClick}>Skąd te ilości?</TextButton>);
    await userEvent.click(screen.getByRole("button", { name: "Skąd te ilości?" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards its ref so focus can return to it", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <TextButton ref={ref} onClick={() => {}}>
        Skąd te ilości?
      </TextButton>,
    );
    ref.current?.focus();
    expect(screen.getByRole("button", { name: "Skąd te ilości?" })).toHaveFocus();
  });
});
