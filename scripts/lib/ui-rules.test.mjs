import { describe, expect, it } from "vitest";
import { checkUiStories, isComponentFile, isStoryFile } from "./ui-rules.mjs";

describe("isComponentFile", () => {
  it("accepts a component", () => {
    expect(isComponentFile("src/components/ui/Button/Button.tsx")).toBe(true);
  });
  it.each([
    "src/components/ui/Button/Button.stories.tsx",
    "src/components/ui/Button/Button.test.tsx",
    "src/components/ui/Button/index.ts",
    "src/components/ui/_shared/cn.ts",
    "src/components/ui/index.ts",
    "src/components/ui/Button.tsx",
    "src/components/Other.tsx",
    "src/app/page.tsx",
  ])("rejects %s", (path) => {
    expect(isComponentFile(path)).toBe(false);
  });
});

describe("isStoryFile", () => {
  it("accepts a story and rejects a component", () => {
    expect(isStoryFile("src/components/ui/Button/Button.stories.tsx")).toBe(true);
    expect(isStoryFile("src/components/ui/Button/Button.tsx")).toBe(false);
    expect(isStoryFile("src/components/ui/Button.stories.tsx")).toBe(false);
  });
});

describe("checkUiStories", () => {
  it("passes when no component changed", () => {
    expect(checkUiStories({ changedFiles: ["src/lib/plan.ts", "docs/product.md"] })).toEqual([]);
  });
  it("passes with no changes at all", () => {
    expect(checkUiStories({})).toEqual([]);
  });
  it("fails when a component changed without a story", () => {
    const failures = checkUiStories({ changedFiles: ["src/components/ui/Button/Button.tsx"] });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("Button.tsx");
    expect(failures[0]).toContain("no-story-needed");
  });
  it("passes when a story changed too", () => {
    expect(
      checkUiStories({
        changedFiles: [
          "src/components/ui/Button/Button.tsx",
          "src/components/ui/Button/Button.stories.tsx",
        ],
      }),
    ).toEqual([]);
  });
  it("passes when the story is in a different folder than the component", () => {
    expect(
      checkUiStories({
        changedFiles: [
          "src/components/ui/Button/Button.tsx",
          "src/components/ui/Panel/Panel.stories.tsx",
        ],
      }),
    ).toEqual([]);
  });
  it("ignores shared helpers and folder indexes", () => {
    expect(
      checkUiStories({
        changedFiles: ["src/components/ui/_shared/cn.ts", "src/components/ui/Button/index.ts"],
      }),
    ).toEqual([]);
  });
  it("ignores a changed test or story on its own", () => {
    expect(checkUiStories({ changedFiles: ["src/components/ui/Button/Button.test.tsx"] })).toEqual(
      [],
    );
  });
  it("passes with the no-story-needed label", () => {
    expect(
      checkUiStories({
        changedFiles: ["src/components/ui/Button/Button.tsx"],
        labels: ["no-story-needed"],
      }),
    ).toEqual([]);
  });
});
