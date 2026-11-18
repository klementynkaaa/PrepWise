import { describe, expect, it } from "vitest";
import { recommendedQuantity, roundUpToStep } from "./quantity";

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

describe("roundUpToStep", () => {
  it.each([
    [27, 1, 27],
    [26.1, 1, 27],
    [4.5, 0.5, 4.5],
    [8.4, 0.5, 8.5],
    [0.3, 0.5, 0.5],
    [0, 1, 0],
  ])("rounds %s up to step %s → %s", (value, step, expected) => {
    expect(roundUpToStep(value, step)).toBe(expected);
  });

  it("does not add a step for float error (0.2 × 3 with step 0.1 is 0.6)", () => {
    const value = 0.2 * 3;
    expect(value).not.toBe(0.6);
    expect(roundUpToStep(value, 0.1)).toBe(0.6);
  });

  it("trims float error from the result (3 steps of 0.1 is 0.3)", () => {
    expect(roundUpToStep(0.25, 0.1)).toBe(0.3);
  });

  it.each([
    [-1, 1],
    [Number.NaN, 1],
    [1, 0],
    [1, -0.5],
    [1, Number.POSITIVE_INFINITY],
  ])("throws RangeError for value %s and step %s", (value, step) => {
    expect(() => roundUpToStep(value, step)).toThrow(RangeError);
  });
});
