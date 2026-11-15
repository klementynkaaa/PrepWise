import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "../../../messages/pl.json";

// Polish plural forms: one (1), few (2-4, 22-24), many (0, 5-21, 25-31), so
// 1, 2, 5, 12 and 22 hit every form the app can show.
const t = createTranslator({ locale: "pl", messages, namespace: "overview" });
const steps = createTranslator({ locale: "pl", messages, namespace: "steps" });

const expected = {
  adults: ["1 dorosły", "2 dorosłych", "5 dorosłych", "12 dorosłych", "22 dorosłych"],
  seniors: ["1 senior", "2 seniorów", "5 seniorów", "12 seniorów", "22 seniorów"],
  children: ["1 dziecko", "2 dzieci", "5 dzieci", "12 dzieci", "22 dzieci"],
  smallChildren: [
    "1 małe dziecko",
    "2 małych dzieci",
    "5 małych dzieci",
    "12 małych dzieci",
    "22 małych dzieci",
  ],
  smallDog: ["1 pies mały", "2 psy małe", "5 psów małych", "12 psów małych", "22 psy małe"],
  mediumDog: [
    "1 pies średni",
    "2 psy średnie",
    "5 psów średnich",
    "12 psów średnich",
    "22 psy średnie",
  ],
  largeDog: ["1 pies duży", "2 psy duże", "5 psów dużych", "12 psów dużych", "22 psy duże"],
  cat: ["1 kot", "2 koty", "5 kotów", "12 kotów", "22 koty"],
  otherSmall: [
    "1 inne małe zwierzę",
    "2 inne małe zwierzęta",
    "5 innych małych zwierząt",
    "12 innych małych zwierząt",
    "22 inne małe zwierzęta",
  ],
} as const;

const numbers = [1, 2, 5, 12, 22];

describe("Polish plurals on the overview counts", () => {
  for (const [key, forms] of Object.entries(expected)) {
    it(`${key} for 1, 2, 5, 12 and 22`, () => {
      const got = numbers.map((count) => t(`counts.${key as keyof typeof expected}`, { count }));
      expect(got).toEqual(forms);
    });
  }

  it("people total", () => {
    const got = numbers.map((count) => t("peopleLine", { groups: "x", total: count }).slice(4));
    expect(got).toEqual([
      "razem 1 osoba",
      "razem 2 osoby",
      "razem 5 osób",
      "razem 12 osób",
      "razem 22 osoby",
    ]);
  });

  it("footer total on the people step", () => {
    expect(numbers.map((count) => steps("people.total", { count }))).toEqual([
      "Razem: 1 osoba",
      "Razem: 2 osoby",
      "Razem: 5 osób",
      "Razem: 12 osób",
      "Razem: 22 osoby",
    ]);
  });
});
