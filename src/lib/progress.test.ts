import { describe, expect, it } from "vitest";
import {
  progressAriaLabel,
  progressCountLabel,
  progressFractionLabel,
  progressPercent,
} from "./progress";

describe("progressPercent", () => {
  it("rounds down to a whole percentage", () => {
    expect(progressPercent(4, 7)).toBe(57);
    expect(progressPercent(2, 3)).toBe(66);
  });

  it("shows 100 only when everything is done", () => {
    expect(progressPercent(199, 200)).toBe(99);
    expect(progressPercent(7, 7)).toBe(100);
  });

  it("returns 0 for an empty total", () => {
    expect(progressPercent(0, 0)).toBe(0);
    expect(progressPercent(3, 0)).toBe(0);
  });

  it("clamps done above the total", () => {
    expect(progressPercent(9, 7)).toBe(100);
  });

  it.each([
    [-1, 7, 0],
    [Number.NaN, 7, 0],
    [3, Number.NaN, 0],
    [3, Number.POSITIVE_INFINITY, 0],
    [3.9, 7, 42],
  ])("handles invalid input (%s of %s) as %s", (done, total, expected) => {
    expect(progressPercent(done, total)).toBe(expected);
  });
});

describe("progress labels", () => {
  it("formats the count in words", () => {
    expect(progressCountLabel(12, 38)).toBe("12 z 38");
  });

  it("formats the short fraction for the ring", () => {
    expect(progressFractionLabel(3, 7)).toBe("3/7");
  });

  it("formats the spoken label", () => {
    expect(progressAriaLabel(12, 38)).toBe("Gotowe 12 z 38");
  });

  it("clamps labels the same way as the percentage", () => {
    expect(progressCountLabel(9, 7)).toBe("7 z 7");
    expect(progressFractionLabel(-2, 7)).toBe("0/7");
  });
});
