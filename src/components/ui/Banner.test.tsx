import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Banner } from "./Banner";
import { bannerIllustrationNames } from "./Illustration";

describe("Banner", () => {
  it("renders the title and the sentence", () => {
    render(
      <Banner title="Plan na 14 dni?" illustration="banner-extend">
        72 godziny to oficjalna podstawa.
      </Banner>,
    );
    expect(screen.getByText("Plan na 14 dni?")).toBeInTheDocument();
    expect(screen.getByText("72 godziny to oficjalna podstawa.")).toBeInTheDocument();
  });

  it.each(bannerIllustrationNames)("keeps the %s art decorative", (name) => {
    const { container } = render(
      <Banner title="Tytuł" illustration={name}>
        Zdanie.
      </Banner>,
    );
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden", "true");
    expect(img).toHaveAttribute("src", `/illustrations/${name}.svg`);
  });

  it("adds no landmark and no heading by default", () => {
    render(
      <Banner title="Tytuł" illustration="banner-water">
        Zdanie.
      </Banner>,
    );
    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("uses the heading level the caller picks", () => {
    render(
      <Banner title="Tytuł" illustration="banner-water" titleAs="h2">
        Zdanie.
      </Banner>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Tytuł" })).toBeInTheDocument();
  });
});
