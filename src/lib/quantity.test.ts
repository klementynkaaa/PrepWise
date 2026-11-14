import { describe, expect, it } from "vitest";
import { recommendedQuantity } from "./quantity";

describe("recommendedQuantity", () => {
  it("multiplies per-person-per-day by people and days (PRD illustration)", () => {
    expect(recommendedQuantity(3, 3, 3)).toBe(27);
  });

  it("returns 0 for zero people", () => {
    expect(recommendedQuantity(3, 0, 3)).toBe(0);
  });

  it.each([
    [-1, 1, 1],
    [1, -1, 1],
    [1, 1, -1],
    [Number.NaN, 1, 1],
    [1, Number.POSITIVE_INFINITY, 1],
    [1, 1, Number.NEGATIVE_INFINITY],
  ])("throws RangeError for invalid input (%s, %s, %s)", (a, b, c) => {
    expect(() => recommendedQuantity(a, b, c)).toThrow(RangeError);
  });
});
