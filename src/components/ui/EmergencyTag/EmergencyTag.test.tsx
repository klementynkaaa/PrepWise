import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmergencyTags } from "./EmergencyTag";

describe("EmergencyTags", () => {
  it("reads the lead first, then each name", () => {
    const { container } = render(
      <EmergencyTags lead="dodane na sytuację:" names={["Brak prądu", "Powódź"]} />,
    );
    expect(screen.getByText("dodane na sytuację:")).toHaveClass("sr-only");
    expect(container).toHaveTextContent("dodane na sytuację:Brak prąduPowódź");
  });

  it("renders nothing without names", () => {
    const { container } = render(<EmergencyTags lead="dodane na sytuację:" names={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
