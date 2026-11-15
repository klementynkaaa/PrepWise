import { describe, expect, it } from "vitest";
import { answers, completeHousehold } from "./fixtures";
import {
  applyStep,
  computeStatus,
  emptyAnswers,
  firstUnfinishedStep,
  nextStepAfter,
  peopleTotal,
  stepPosition,
  stepsFor,
} from "./steps";

describe("stepsFor", () => {
  it("includes pets only when the household has pets", () => {
    expect(stepsFor({ hasPets: true })).toEqual(["people", "pets", "housing", "needs"]);
    expect(stepsFor({ hasPets: false })).toEqual(["people", "housing", "needs"]);
  });
});

describe("stepPosition", () => {
  it("counts 4 steps with pets and numbers them consecutively", () => {
    const d = answers({ hasPets: true });
    expect(stepPosition(d, "people")).toEqual({ current: 1, total: 4 });
    expect(stepPosition(d, "pets")).toEqual({ current: 2, total: 4 });
    expect(stepPosition(d, "housing")).toEqual({ current: 3, total: 4 });
    expect(stepPosition(d, "needs")).toEqual({ current: 4, total: 4 });
  });

  it("counts 3 steps without pets and skips the gap", () => {
    const d = answers({ hasPets: false });
    expect(stepPosition(d, "people")).toEqual({ current: 1, total: 3 });
    expect(stepPosition(d, "housing")).toEqual({ current: 2, total: 3 });
    expect(stepPosition(d, "needs")).toEqual({ current: 3, total: 3 });
  });

  it("follows the live pets answer on step 1", () => {
    expect(stepPosition(answers({ hasPets: false }), "people")?.total).toBe(3);
    expect(stepPosition(answers({ hasPets: true }), "people")?.total).toBe(4);
  });

  it("returns null for pets when there are none", () => {
    expect(stepPosition(answers({ hasPets: false }), "pets")).toBeNull();
  });
});

describe("firstUnfinishedStep", () => {
  it("starts at people for an empty draft", () => {
    expect(firstUnfinishedStep(emptyAnswers())).toBe("people");
  });

  it("returns the first step not confirmed", () => {
    expect(firstUnfinishedStep(answers({ completedSteps: ["people"] }))).toBe("housing");
    expect(firstUnfinishedStep(answers({ completedSteps: ["people"], hasPets: true }))).toBe(
      "pets",
    );
  });

  it("ignores a pets step that is not in the flow", () => {
    expect(firstUnfinishedStep(answers({ completedSteps: ["people", "housing"] }))).toBe("needs");
  });

  it("returns the overview when everything is done", () => {
    expect(firstUnfinishedStep(completeHousehold())).toBe("overview");
  });
});

describe("nextStepAfter while filling in", () => {
  it("walks the steps with pets", () => {
    const d = answers({ hasPets: true });
    expect(nextStepAfter(d, "people")).toBe("pets");
    expect(nextStepAfter(d, "pets")).toBe("housing");
    expect(nextStepAfter(d, "housing")).toBe("needs");
    expect(nextStepAfter(d, "needs")).toBe("overview");
  });

  it("skips pets without them", () => {
    const d = answers({ hasPets: false });
    expect(nextStepAfter(d, "people")).toBe("housing");
    expect(nextStepAfter(d, "needs")).toBe("overview");
  });
});

describe("nextStepAfter in edit mode", () => {
  const done = completeHousehold({
    hasPets: false,
    completedSteps: ["people", "housing", "needs"],
    pets: { smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 },
  });

  it("returns to the overview", () => {
    expect(nextStepAfter(done, "housing")).toBe("overview");
    expect(nextStepAfter(done, "people", { previousHasPets: false })).toBe("overview");
  });

  it("returns to the overview when pets stay yes", () => {
    expect(nextStepAfter(completeHousehold(), "people", { previousHasPets: true })).toBe(
      "overview",
    );
  });

  it("goes to pets first when the answer changed from no to yes", () => {
    const edited = applyStep(done, "people", { people: done.people, hasPets: true });
    expect(computeStatus(edited)).toBe("draft");
    expect(
      nextStepAfter(edited, "people", { previousHasPets: false, previousStatus: "complete" }),
    ).toBe("pets");
  });

  it("returns to the overview after the new pets step is saved", () => {
    const edited = applyStep(
      applyStep(done, "people", { people: done.people, hasPets: true }),
      "pets",
      { pets: { smallDog: 1, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 } },
    );
    expect(nextStepAfter(edited, "pets", { previousStatus: "draft" })).toBe("overview");
    expect(nextStepAfter(edited, "pets", { previousStatus: "complete" })).toBe("overview");
  });

  it("goes to the overview when pets switch from yes to no", () => {
    const edited = applyStep(completeHousehold(), "people", {
      people: completeHousehold().people,
      hasPets: false,
    });
    expect(nextStepAfter(edited, "people", { previousHasPets: true })).toBe("overview");
  });
});

describe("peopleTotal", () => {
  it("sums people and never counts pets", () => {
    const d = answers({
      people: { adults: 2, seniors: 1, children: 3, smallChildren: 1 },
      hasPets: true,
      pets: { smallDog: 2, mediumDog: 0, largeDog: 0, cat: 5, otherSmall: 1 },
    });
    expect(peopleTotal(d)).toBe(7);
  });

  it("is the same with and without pets", () => {
    const people = { adults: 1, seniors: 0, children: 0, smallChildren: 0 };
    expect(peopleTotal(answers({ people, hasPets: true }))).toBe(
      peopleTotal(answers({ people, hasPets: false })),
    );
  });
});

describe("applyStep", () => {
  it("saves people and marks the step done", () => {
    const people = { adults: 2, seniors: 0, children: 0, smallChildren: 1 };
    const next = applyStep(emptyAnswers(), "people", { people, hasPets: true });
    expect(next.people).toEqual(people);
    expect(next.hasPets).toBe(true);
    expect(next.completedSteps).toEqual(["people"]);
  });

  it("zeroes every pet count and drops the pets step when hasPets is false", () => {
    const next = applyStep(completeHousehold(), "people", {
      people: completeHousehold().people,
      hasPets: false,
    });
    expect(next.pets).toEqual({ smallDog: 0, mediumDog: 0, largeDog: 0, cat: 0, otherSmall: 0 });
    expect(next.completedSteps).toEqual(["people", "housing", "needs"]);
  });

  it("keeps pet counts when hasPets stays true", () => {
    const next = applyStep(completeHousehold(), "people", {
      people: completeHousehold().people,
      hasPets: true,
    });
    expect(next.pets.cat).toBe(1);
    expect(next.completedSteps).toContain("pets");
  });

  it("saves pets, housing and needs", () => {
    let d = applyStep(answers({ hasPets: true }), "pets", {
      pets: { smallDog: 0, mediumDog: 1, largeDog: 0, cat: 0, otherSmall: 0 },
    });
    d = applyStep(d, "housing", { housingType: "house" });
    d = applyStep(d, "needs", { needs: ["specialDiet"] });
    expect(d.pets.mediumDog).toBe(1);
    expect(d.housingType).toBe("house");
    expect(d.needs).toEqual(["specialDiet"]);
    expect(d.completedSteps).toEqual(["pets", "housing", "needs"]);
  });

  it("does not mutate its input", () => {
    const before = completeHousehold();
    const snapshot = structuredClone(before);
    applyStep(before, "people", { people: before.people, hasPets: false });
    expect(before).toEqual(snapshot);
  });
});

describe("computeStatus", () => {
  it("is complete when every required step is done", () => {
    expect(computeStatus(completeHousehold())).toBe("complete");
  });

  it("needs at least one person", () => {
    expect(
      computeStatus(
        completeHousehold({ people: { adults: 0, seniors: 0, children: 0, smallChildren: 0 } }),
      ),
    ).toBe("draft");
  });

  it("needs housing chosen", () => {
    expect(computeStatus(completeHousehold({ housingType: null }))).toBe("draft");
  });

  it("needs the needs step confirmed, though its list may be empty", () => {
    expect(
      computeStatus(completeHousehold({ completedSteps: ["people", "pets", "housing"] })),
    ).toBe("draft");
    expect(computeStatus(completeHousehold({ needs: [] }))).toBe("complete");
  });

  it("requires pets only when the household has pets", () => {
    const noPets = completeHousehold({
      hasPets: false,
      completedSteps: ["people", "housing", "needs"],
    });
    expect(computeStatus(noPets)).toBe("complete");
    expect(
      computeStatus(completeHousehold({ completedSteps: ["people", "housing", "needs"] })),
    ).toBe("draft");
  });
});
