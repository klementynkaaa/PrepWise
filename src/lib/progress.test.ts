import { describe, expect, it } from "vitest";
import { clampProgress, progressPercent } from "./progress";

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

describe("clampProgress", () => {
  it("keeps valid counts", () => {
    expect(clampProgress(12, 38)).toEqual({ done: 12, total: 38 });
  });

  it("clamps the same way as the percentage", () => {
    expect(clampProgress(9, 7)).toEqual({ done: 7, total: 7 });
    expect(clampProgress(-2, 7)).toEqual({ done: 0, total: 7 });
    expect(clampProgress(3.9, Number.NaN)).toEqual({ done: 0, total: 0 });
  });
});
