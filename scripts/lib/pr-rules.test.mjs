import { describe, expect, it } from "vitest";
import {
  checkPullRequest,
  isAllowedSource,
  isHotfixHead,
  isValidTitle,
  isWorkBranch,
} from "./pr-rules.mjs";

describe("isValidTitle", () => {
  it.each(["feat", "fix", "chore", "docs", "refactor", "test", "ci", "perf", "build", "revert"])(
    "accepts the %s type",
    (type) => {
      expect(isValidTitle(`${type}: do a thing`)).toBe(true);
    },
  );

  it("accepts a scope and a breaking marker", () => {
    expect(isValidTitle("feat(plan-view): add list")).toBe(true);
    expect(isValidTitle("fix!: drop old field")).toBe(true);
    expect(isValidTitle("chore(release): 2026-11-20")).toBe(true);
  });

  it.each([
    "Add stuff",
    "feat:",
    "feat: ",
    "feat:no space",
    "feat(Scope): x",
    "feat(): x",
    "unknown: x",
    "Feat: x",
    "",
  ])("rejects %j", (title) => {
    expect(isValidTitle(title)).toBe(false);
  });

  it("rejects a missing title", () => {
    expect(isValidTitle(undefined)).toBe(false);
  });
});

describe("isWorkBranch", () => {
  it.each(["feature", "bugfix", "refactor", "chore", "docs", "hotfix"])("accepts %s/", (prefix) => {
    expect(isWorkBranch(`${prefix}/some-change-2`)).toBe(true);
  });

  it.each([
    "fix/x",
    "Feature/x",
    "feature/Foo",
    "feature/a_b",
    "feature/",
    "feature/a--b",
    "feature/-a",
    "main",
    "",
  ])("rejects %j", (ref) => {
    expect(isWorkBranch(ref)).toBe(false);
  });
});

describe("isHotfixHead", () => {
  it("accepts hotfix/<kebab>", () => {
    expect(isHotfixHead("hotfix/x")).toBe(true);
    expect(isHotfixHead("hotfix/fix-sw-cache")).toBe(true);
  });

  it.each(["hotfix/", "hotfix", "feature/hotfix-x", "hotfix/Bad", "", undefined])(
    "rejects %j",
    (ref) => {
      expect(isHotfixHead(ref)).toBe(false);
    },
  );
});

describe("isAllowedSource", () => {
  it("into develop: work branches and main, but not hotfix or develop", () => {
    for (const prefix of ["feature", "bugfix", "refactor", "chore", "docs"]) {
      expect(isAllowedSource(`${prefix}/x`, "develop")).toBe(true);
    }
    expect(isAllowedSource("main", "develop")).toBe(true);
    expect(isAllowedSource("hotfix/x", "develop")).toBe(false);
    expect(isAllowedSource("develop", "develop")).toBe(false);
  });

  it("into main: develop and hotfix only", () => {
    expect(isAllowedSource("develop", "main")).toBe(true);
    expect(isAllowedSource("hotfix/x", "main")).toBe(true);
    expect(isAllowedSource("feature/x", "main")).toBe(false);
    expect(isAllowedSource("main", "main")).toBe(false);
  });

  it("rejects other base branches", () => {
    expect(isAllowedSource("feature/x", "release")).toBe(false);
  });
});

describe("checkPullRequest", () => {
  it("accepts a normal work PR", () => {
    expect(
      checkPullRequest({ title: "feat(x): y", headRef: "feature/x", baseRef: "develop" }),
    ).toEqual([]);
  });

  it("accepts the release PR and the sync PR", () => {
    expect(
      checkPullRequest({
        title: "chore(release): 2026-11-20",
        headRef: "develop",
        baseRef: "main",
      }),
    ).toEqual([]);
    expect(
      checkPullRequest({ title: "chore: sync main", headRef: "main", baseRef: "develop" }),
    ).toEqual([]);
  });

  it("accepts a hotfix into main", () => {
    expect(
      checkPullRequest({ title: "fix: urgent", headRef: "hotfix/urgent", baseRef: "main" }),
    ).toEqual([]);
  });

  it("reports a bad title", () => {
    const failures = checkPullRequest({
      title: "Add stuff",
      headRef: "feature/x",
      baseRef: "develop",
    });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/Conventional/);
  });

  it("reports a bad branch name and a disallowed source together", () => {
    const failures = checkPullRequest({ title: "feat: x", headRef: "fix/x", baseRef: "develop" });
    expect(failures).toHaveLength(2);
  });

  it("rejects hotfix into develop", () => {
    const failures = checkPullRequest({ title: "fix: x", headRef: "hotfix/x", baseRef: "develop" });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/cannot be merged/);
  });

  it("rejects a feature branch straight into main", () => {
    expect(
      checkPullRequest({ title: "feat: x", headRef: "feature/x", baseRef: "main" }),
    ).toHaveLength(1);
  });
});
