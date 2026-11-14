import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classicRemovalProblems,
  diffEnvironment,
  diffRepoSettings,
  diffRuleset,
  diffValues,
  environmentBody,
  normalizeLiveEnvironment,
  normalizeRuleset,
  planBranchPolicies,
} from "./repo-settings.mjs";

const read = (path) =>
  JSON.parse(readFileSync(new URL(`../../.github/${path}`, import.meta.url), "utf8"));

const develop = read("rulesets/develop.json");
const main = read("rulesets/main.json");
const staging = read("environments/staging.json");
const production = read("environments/production.json");

// What the API returns for a ruleset: the file plus read-only fields and filled-in defaults.
function liveRuleset(file) {
  const live = structuredClone(file);
  Object.assign(live, {
    id: 42,
    node_id: "RRS_x",
    source: "owner/repo",
    source_type: "Repository",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    _links: { self: { href: "x" } },
    current_user_can_bypass: "never",
  });
  live.rules = [...live.rules].reverse();
  return live;
}

describe("settings files", () => {
  it("define the agreed rulesets", () => {
    expect(develop.conditions.ref_name.include).toEqual(["refs/heads/develop"]);
    expect(main.conditions.ref_name.include).toEqual(["refs/heads/main"]);
    for (const file of [develop, main]) {
      expect(file.enforcement).toBe("active");
      expect(file.bypass_actors).toEqual([]);
      expect(file.rules.map((r) => r.type).sort()).toEqual([
        "deletion",
        "non_fast_forward",
        "pull_request",
        "required_status_checks",
      ]);
    }
  });

  it("requires the six checks with the GitHub Actions integration", () => {
    const checks = main.rules.find((r) => r.type === "required_status_checks").parameters;
    expect(checks.required_status_checks.map((c) => c.context)).toEqual([
      "Lint, type check, build",
      "Unit & integration tests",
      "Browser tests (offline + a11y)",
      "Dependency audit",
      "Secret scan",
      "PR conventions",
    ]);
    expect(new Set(checks.required_status_checks.map((c) => c.integration_id))).toEqual(
      new Set([15368]),
    );
  });

  it("sets strict only on main and merge methods per branch", () => {
    const strict = (f) =>
      f.rules.find((r) => r.type === "required_status_checks").parameters
        .strict_required_status_checks_policy;
    const methods = (f) =>
      f.rules.find((r) => r.type === "pull_request").parameters.allowed_merge_methods;
    expect(strict(develop)).toBe(false);
    expect(strict(main)).toBe(true);
    expect(methods(develop)).toEqual(["squash", "merge"]);
    expect(methods(main)).toEqual(["merge"]);
  });
});

describe("normalizeRuleset", () => {
  it("drops read-only fields", () => {
    const normalized = normalizeRuleset(liveRuleset(develop));
    for (const key of [
      "id",
      "node_id",
      "source",
      "source_type",
      "created_at",
      "updated_at",
      "_links",
      "current_user_can_bypass",
    ]) {
      expect(normalized).not.toHaveProperty(key);
    }
  });

  it("orders rules and lists stably", () => {
    expect(normalizeRuleset(liveRuleset(develop))).toEqual(normalizeRuleset(develop));
  });
});

describe("diffRuleset", () => {
  it("reports no drift for a live ruleset with only read-only extras", () => {
    expect(diffRuleset(develop, liveRuleset(develop))).toEqual([]);
    expect(diffRuleset(main, liveRuleset(main))).toEqual([]);
  });

  it("ignores defaults the API adds inside rule parameters", () => {
    const live = liveRuleset(develop);
    live.rules.find((r) => r.type === "pull_request").parameters.require_extra_thing = false;
    expect(diffRuleset(develop, live)).toEqual([]);
  });

  it("reports a missing ruleset", () => {
    expect(diffRuleset(develop, undefined)).toEqual([
      'ruleset "develop protection" does not exist',
    ]);
  });

  it("reports changed enforcement", () => {
    const live = liveRuleset(develop);
    live.enforcement = "evaluate";
    expect(diffRuleset(develop, live).join("\n")).toContain("enforcement");
  });

  it("reports a changed required check list", () => {
    const live = liveRuleset(develop);
    live.rules
      .find((r) => r.type === "required_status_checks")
      .parameters.required_status_checks.pop();
    expect(diffRuleset(develop, live)).not.toEqual([]);
  });

  it("reports a different strict policy", () => {
    const live = liveRuleset(main);
    live.rules.find(
      (r) => r.type === "required_status_checks",
    ).parameters.strict_required_status_checks_policy = false;
    expect(diffRuleset(main, live).join("\n")).toContain("strict_required_status_checks_policy");
  });

  it("reports unexpected live rules and bypass actors", () => {
    const live = liveRuleset(develop);
    live.rules.push({ type: "required_linear_history" });
    live.bypass_actors = [{ actor_id: 1, actor_type: "Team", bypass_mode: "always" }];
    const problems = diffRuleset(develop, live).join("\n");
    expect(problems).toContain("required_linear_history");
    expect(problems).toContain("bypass_actors");
  });
});

describe("diffValues", () => {
  it("ignores extra keys in live objects but not missing ones", () => {
    expect(diffValues({ a: 1 }, { a: 1, b: 2 })).toEqual([]);
    expect(diffValues({ a: 1 }, {})).toHaveLength(1);
  });

  it("compares arrays by length and position", () => {
    expect(diffValues([1, 2], [1, 2])).toEqual([]);
    expect(diffValues([1, 2], [1])).toHaveLength(1);
    expect(diffValues([1], "x")).toHaveLength(1);
  });
});

function liveEnvironment({ reviewers = [], preventSelf = false, policy } = {}) {
  return {
    id: 7,
    node_id: "x",
    name: "e",
    url: "u",
    html_url: "h",
    created_at: "t",
    updated_at: "t",
    protection_rules: [
      { id: 1, node_id: "n", type: "branch_policy" },
      ...(reviewers.length > 0
        ? [
            {
              id: 2,
              node_id: "n",
              type: "required_reviewers",
              prevent_self_review: preventSelf,
              reviewers: reviewers.map((login) => ({
                type: "User",
                reviewer: { login, id: 99, type: "User" },
              })),
            },
          ]
        : []),
    ],
    deployment_branch_policy: policy ?? { protected_branches: false, custom_branch_policies: true },
  };
}

const mainPolicy = [{ id: 5, node_id: "n", name: "main", type: "branch" }];

describe("diffEnvironment", () => {
  it("reports no drift for matching environments", () => {
    expect(diffEnvironment("staging", staging, liveEnvironment(), mainPolicy)).toEqual([]);
    expect(
      diffEnvironment(
        "production",
        production,
        liveEnvironment({ reviewers: ["klementynkaaa"] }),
        mainPolicy,
      ),
    ).toEqual([]);
  });

  it("reports a missing environment", () => {
    expect(diffEnvironment("staging", staging, undefined, [])).toEqual([
      'environment "staging" does not exist',
    ]);
  });

  it("reports a missing reviewer, self-review and branch policy drift", () => {
    expect(
      diffEnvironment("production", production, liveEnvironment(), mainPolicy).join("\n"),
    ).toContain("reviewers");
    expect(
      diffEnvironment(
        "production",
        production,
        liveEnvironment({ reviewers: ["klementynkaaa"], preventSelf: true }),
        mainPolicy,
      ).join("\n"),
    ).toContain("prevent_self_review");
    expect(diffEnvironment("staging", staging, liveEnvironment(), []).join("\n")).toContain(
      "branch_policies",
    );
    expect(
      diffEnvironment(
        "staging",
        staging,
        liveEnvironment({ policy: { protected_branches: true, custom_branch_policies: false } }),
        mainPolicy,
      ).join("\n"),
    ).toContain("deployment_branch_policy");
  });

  it("normalizes a live environment without reviewers", () => {
    expect(normalizeLiveEnvironment(liveEnvironment(), mainPolicy)).toEqual({
      wait_timer: 0,
      prevent_self_review: false,
      reviewers: [],
      deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
      branch_policies: ["branch:main"],
    });
  });
});

describe("environmentBody", () => {
  it("resolves reviewer logins to user IDs", () => {
    expect(environmentBody(production, { klementynkaaa: 123 })).toEqual({
      wait_timer: 0,
      prevent_self_review: false,
      reviewers: [{ type: "User", id: 123 }],
      deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
    });
  });

  it("throws when a login has no ID", () => {
    expect(() => environmentBody(production, {})).toThrow(/klementynkaaa/);
  });
});

describe("planBranchPolicies", () => {
  it("creates missing and removes extra policies", () => {
    const plan = planBranchPolicies(staging, [{ id: 1, name: "develop", type: "branch" }]);
    expect(plan.create).toEqual([{ name: "main", type: "branch" }]);
    expect(plan.remove.map((p) => p.id)).toEqual([1]);
  });

  it("does nothing when equal", () => {
    expect(planBranchPolicies(staging, mainPolicy)).toEqual({ create: [], remove: [] });
  });
});

describe("diffRepoSettings", () => {
  const desired = read("repo-settings.json");

  it("ignores unrelated live fields", () => {
    expect(diffRepoSettings(desired, { ...desired, id: 1, name: "x", private: false })).toEqual([]);
  });

  it("reports changed and missing fields", () => {
    const live = { ...desired, allow_rebase_merge: true };
    delete live.delete_branch_on_merge;
    const problems = diffRepoSettings(desired, live).join("\n");
    expect(problems).toContain("allow_rebase_merge");
    expect(problems).toContain("delete_branch_on_merge");
  });
});

describe("classicRemovalProblems", () => {
  const names = ["develop protection", "main protection"];

  it("allows removal when both rulesets are active", () => {
    const live = names.map((name) => ({ name, enforcement: "active" }));
    expect(classicRemovalProblems(names, live)).toEqual([]);
  });

  it("refuses when a ruleset is missing or not active", () => {
    const problems = classicRemovalProblems(names, [
      { name: "develop protection", enforcement: "evaluate" },
    ]);
    expect(problems).toHaveLength(2);
    expect(problems.join("\n")).toContain("not active");
    expect(problems.join("\n")).toContain("does not exist");
  });
});
