// Checks or applies the repository settings kept in .github/ (rulesets, environments, merge options).
// Usage (owner, with admin rights through `gh auth`):
//   node scripts/repo-settings.mjs --check
//   node scripts/repo-settings.mjs --apply
//   node scripts/repo-settings.mjs --remove-classic-protection
// Set REPO=owner/name to target another repository; the default is the current checkout's.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  classicRemovalProblems,
  diffEnvironment,
  diffRepoSettings,
  diffRuleset,
  environmentBody,
  planBranchPolicies,
} from "./lib/repo-settings.mjs";

const RULESET_FILES = ["develop", "main"];
const ENVIRONMENTS = ["staging", "production"];
const CLASSIC_BRANCHES = ["develop", "main"];

const readJson = (path) =>
  JSON.parse(readFileSync(new URL(`../.github/${path}`, import.meta.url), "utf8"));

function gh(args, body) {
  try {
    const out = execFileSync("gh", ["api", ...args, ...(body ? ["--input", "-"] : [])], {
      encoding: "utf8",
      input: body ? JSON.stringify(body) : undefined,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return out.trim() ? JSON.parse(out) : null;
  } catch (error) {
    const text = `${error.stderr ?? ""}${error.stdout ?? ""}`;
    if (/HTTP 404|Not Found/.test(text)) return undefined;
    throw new Error(`gh api ${args.join(" ")} failed: ${text.trim() || error.message}`);
  }
}

const repo =
  process.env.REPO ??
  execFileSync("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], {
    encoding: "utf8",
  }).trim();
const api = (path) => `repos/${repo}/${path}`;

function liveRulesets() {
  const summaries = gh([api("rulesets")]) ?? [];
  return summaries
    .filter((s) => s.source_type === undefined || s.source_type === "Repository")
    .map((s) => gh([api(`rulesets/${s.id}`)]));
}

function envPolicies(name) {
  const res = gh([api(`environments/${name}/deployment-branch-policies`)]);
  return res?.branch_policies ?? [];
}

function check() {
  const problems = [];
  const live = liveRulesets();
  for (const file of RULESET_FILES) {
    const desired = readJson(`rulesets/${file}.json`);
    problems.push(
      ...diffRuleset(
        desired,
        live.find((r) => r.name === desired.name),
      ),
    );
  }
  for (const name of ENVIRONMENTS) {
    const env = gh([api(`environments/${name}`)]);
    problems.push(
      ...diffEnvironment(
        name,
        readJson(`environments/${name}.json`),
        env,
        env ? envPolicies(name) : [],
      ),
    );
  }
  problems.push(...diffRepoSettings(readJson("repo-settings.json"), gh([`repos/${repo}`])));
  if (problems.length === 0) {
    console.log("Repository settings match .github/: no drift.");
    return 0;
  }
  for (const problem of problems) console.error(`drift: ${problem}`);
  console.error(`${problems.length} difference(s). Run with --apply to fix.`);
  return 1;
}

function apply() {
  gh(["-X", "PATCH", `repos/${repo}`], readJson("repo-settings.json"));
  console.log("Updated repo settings.");

  for (const name of ENVIRONMENTS) {
    const file = readJson(`environments/${name}.json`);
    const userIds = {};
    for (const reviewer of file.reviewers ?? []) {
      userIds[reviewer.login] = gh([`users/${reviewer.login}`]).id;
    }
    gh(["-X", "PUT", api(`environments/${name}`)], environmentBody(file, userIds));
    const plan = planBranchPolicies(file, envPolicies(name));
    for (const policy of plan.create) {
      gh(["-X", "POST", api(`environments/${name}/deployment-branch-policies`)], policy);
    }
    for (const policy of plan.remove) {
      gh(["-X", "DELETE", api(`environments/${name}/deployment-branch-policies/${policy.id}`)]);
    }
    console.log(`Updated environment ${name}.`);
  }

  const live = liveRulesets();
  for (const file of RULESET_FILES) {
    const desired = readJson(`rulesets/${file}.json`);
    const existing = live.find((r) => r.name === desired.name);
    if (existing) gh(["-X", "PUT", api(`rulesets/${existing.id}`)], desired);
    else gh(["-X", "POST", api("rulesets")], desired);
    console.log(`${existing ? "Updated" : "Created"} ruleset "${desired.name}".`);
  }
  return 0;
}

function removeClassicProtection() {
  const names = RULESET_FILES.map((file) => readJson(`rulesets/${file}.json`).name);
  const problems = classicRemovalProblems(names, liveRulesets());
  if (problems.length > 0) {
    for (const problem of problems)
      console.error(`refusing to remove classic protection: ${problem}`);
    return 1;
  }
  for (const branch of CLASSIC_BRANCHES) {
    const removed = gh(["-X", "DELETE", api(`branches/${branch}/protection`)]);
    console.log(
      removed === undefined
        ? `No classic protection on ${branch}.`
        : `Removed classic protection on ${branch}.`,
    );
  }
  return 0;
}

const flag = process.argv[2];
const commands = {
  "--check": check,
  "--apply": apply,
  "--remove-classic-protection": removeClassicProtection,
};
if (!commands[flag] || process.argv.length > 3) {
  console.error(
    "Usage: node scripts/repo-settings.mjs --check | --apply | --remove-classic-protection",
  );
  process.exit(2);
}
try {
  process.exit(commands[flag]());
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
