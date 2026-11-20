import { describe, expect, it } from "vitest";
import { mergeMessages, messages } from "./messages";

describe("mergeMessages", () => {
  it("deep-merges branches both files share", () => {
    expect(mergeMessages({ plan: { a: "1" }, x: "y" }, { plan: { b: "2" } })).toEqual({
      plan: { a: "1", b: "2" },
      x: "y",
    });
  });

  it("throws on a key present in both", () => {
    expect(() => mergeMessages({ plan: { a: "1" } }, { plan: { a: "2" } })).toThrow(/plan\.a/);
    expect(() => mergeMessages({ a: "1" }, { a: { b: "2" } })).toThrow(/"a"/);
  });

  it("merges the real files without overlap", () => {
    expect(messages.plan.items["drinking-water"].name).toBeTruthy();
    expect(messages.plan.units).toBeTruthy();
  });
});
