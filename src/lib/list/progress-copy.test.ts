import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "../../../messages/pl.json";

// Polish plural forms: one (1), few (2-4, 22-24), many (0, 5-21, 25-31), so
// 1, 2, 5, 12 and 22 hit every form the list can show.
const list = createTranslator({ locale: "pl", messages, namespace: "list" });
const progress = createTranslator({ locale: "pl", messages, namespace: "progress" });

describe("list progress copy", () => {
  it("says how many things are left for 1, 2, 5, 12 and 22", () => {
    expect([1, 2, 5, 12, 22].map((count) => list("progress.left", { count }))).toEqual([
      "Została 1 rzecz do odhaczenia.",
      "Zostały 2 rzeczy do odhaczenia.",
      "Zostało 5 rzeczy do odhaczenia.",
      "Zostało 12 rzeczy do odhaczenia.",
      "Zostały 22 rzeczy do odhaczenia.",
    ]);
  });

  it("formats the shared progress words", () => {
    expect(progress("count", { done: 7, total: 22 })).toBe("7 z 22");
    expect(progress("done", { done: 7, total: 22 })).toBe("Gotowe 7 z 22");
    expect(progress("fraction", { done: 7, total: 22 })).toBe("7/22");
  });
});
