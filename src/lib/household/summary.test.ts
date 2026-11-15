import { describe, expect, it } from "vitest";
import { answers, completeHousehold } from "./fixtures";
import { summarise } from "./summary";

describe("summarise", () => {
  it("returns plain counts, housing and needs", () => {
    const s = summarise(
      completeHousehold({
        people: { adults: 2, seniors: 1, children: 0, smallChildren: 1 },
        pets: { smallDog: 1, mediumDog: 0, largeDog: 0, cat: 2, otherSmall: 0 },
        needs: ["limitedMobility", "specialDiet"],
        housingType: "house",
      }),
    );
    expect(s).toEqual({
      people: { adults: 2, seniors: 1, children: 0, smallChildren: 1 },
      peopleTotal: 4,
      hasPets: true,
      pets: { smallDog: 1, mediumDog: 0, largeDog: 0, cat: 2, otherSmall: 0 },
      petsTotal: 3,
      housingType: "house",
      needs: ["limitedMobility", "specialDiet"],
    });
  });

  it("keeps pets out of the people total", () => {
    expect(summarise(completeHousehold()).peopleTotal).toBe(3);
  });

  it("reports no pets when hasPets is false, even with stale counts", () => {
    const s = summarise(
      answers({
        hasPets: false,
        pets: { smallDog: 3, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 },
      }),
    );
    expect(s.petsTotal).toBe(0);
    expect(s.pets.smallDog).toBe(0);
  });

  it("copies lists so the draft cannot be changed through it", () => {
    const d = completeHousehold();
    summarise(d).needs.push("specialDiet");
    expect(d.needs).toEqual(["regularMedicines"]);
  });

  it("handles an empty draft", () => {
    const s = summarise(answers());
    expect(s.peopleTotal).toBe(0);
    expect(s.housingType).toBeNull();
    expect(s.needs).toEqual([]);
  });
});
