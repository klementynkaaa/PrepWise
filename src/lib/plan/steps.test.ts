import { describe, expect, it } from "vitest";
import { startSteps } from "./steps";

const states = (input: Parameters<typeof startSteps>[0]) =>
  startSteps(input).steps.map((step) => `${step.id}:${step.state}`);

describe("startSteps", () => {
  it("makes supplies the current step before the list exists", () => {
    const result = startSteps({ stage: "ready", homeLeft: 22, hasBackpack: true });
    expect(states({ stage: "ready", homeLeft: 22, hasBackpack: true })).toEqual([
      "plan:done",
      "supplies:current",
      "backpack:later",
    ]);
    expect(result.current).toBe(2);
  });

  it("keeps supplies current while the list has home items left", () => {
    expect(states({ stage: "collecting", homeLeft: 3, hasBackpack: true })).toEqual([
      "plan:done",
      "supplies:current",
      "backpack:later",
    ]);
  });

  it("moves to the backpack once home supplies are ticked", () => {
    const input = { stage: "collecting", homeLeft: 0, hasBackpack: true } as const;
    expect(states(input)).toEqual(["plan:done", "supplies:done", "backpack:current"]);
    expect(startSteps(input).current).toBe(3);
  });

  it("is all done when the stage is complete", () => {
    const result = startSteps({ stage: "complete", homeLeft: 0, hasBackpack: true });
    expect(result.steps.every((step) => step.state === "done")).toBe(true);
    expect(result.current).toBeNull();
  });

  it("has two steps without a backpack", () => {
    expect(states({ stage: "collecting", homeLeft: 4, hasBackpack: false })).toEqual([
      "plan:done",
      "supplies:current",
    ]);
    expect(startSteps({ stage: "complete", homeLeft: 0, hasBackpack: false }).current).toBeNull();
  });
});
