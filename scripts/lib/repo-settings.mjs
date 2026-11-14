// Pure helpers for scripts/repo-settings.mjs: normalize live GitHub API responses and
// compare them with the committed settings files in .github/.

// Fields the API adds to a ruleset that are not part of the settings we manage.
export const READ_ONLY_RULESET_KEYS = [
  "id",
  "node_id",
  "source",
  "source_type",
  "created_at",
  "updated_at",
  "_links",
  "current_user_can_bypass",
];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function sortBy(list, key) {
  return [...list].sort((a, b) => String(key(a)).localeCompare(String(key(b))));
}

function normalizeRule(rule) {
  const out = { type: rule.type };
  if (isObject(rule.parameters)) {
    const parameters = { ...rule.parameters };
    if (Array.isArray(parameters.required_status_checks)) {
      parameters.required_status_checks = sortBy(
        parameters.required_status_checks,
        (c) => c.context,
      );
    }
    if (Array.isArray(parameters.allowed_merge_methods)) {
      parameters.allowed_merge_methods = [...parameters.allowed_merge_methods].sort();
    }
    out.parameters = parameters;
  }
  return out;
}

// Drops read-only fields and puts lists in a stable order, so two equal rulesets compare equal.
export function normalizeRuleset(ruleset) {
  const out = {};
  for (const [key, value] of Object.entries(ruleset ?? {})) {
    if (!READ_ONLY_RULESET_KEYS.includes(key)) out[key] = value;
  }
  out.bypass_actors = sortBy(out.bypass_actors ?? [], (a) => `${a.actor_type}:${a.actor_id}`);
  if (isObject(out.conditions?.ref_name)) {
    const { include = [], exclude = [] } = out.conditions.ref_name;
    out.conditions = {
      ...out.conditions,
      ref_name: { include: [...include].sort(), exclude: [...exclude].sort() },
    };
  }
  out.rules = sortBy((out.rules ?? []).map(normalizeRule), (r) => r.type);
  return out;
}

// Compares `desired` against `live`. Every key in `desired` must match; extra keys the API
// returns in `live` objects (defaults it fills in) are ignored. Arrays must have equal length.
export function diffValues(desired, live, path = "") {
  const here = path || "(root)";
  if (Array.isArray(desired)) {
    if (!Array.isArray(live)) return [`${here}: expected a list, found ${JSON.stringify(live)}`];
    if (desired.length !== live.length) {
      return [`${here}: expected ${JSON.stringify(desired)}, found ${JSON.stringify(live)}`];
    }
    return desired.flatMap((item, i) => diffValues(item, live[i], `${path}[${i}]`));
  }
  if (isObject(desired)) {
    if (!isObject(live)) return [`${here}: expected an object, found ${JSON.stringify(live)}`];
    return Object.keys(desired).flatMap((key) =>
      diffValues(desired[key], live[key], path ? `${path}.${key}` : key),
    );
  }
  return desired === live
    ? []
    : [`${here}: expected ${JSON.stringify(desired)}, found ${JSON.stringify(live)}`];
}

// Returns a list of differences; empty means the live ruleset matches the file.
export function diffRuleset(desired, live) {
  if (!live) return [`ruleset "${desired.name}" does not exist`];
  const want = normalizeRuleset(desired);
  const have = normalizeRuleset(live);
  const problems = diffValues(want, have);
  const wantTypes = new Set(want.rules.map((r) => r.type));
  for (const rule of have.rules) {
    if (!wantTypes.has(rule.type)) problems.push(`rules: unexpected live rule "${rule.type}"`);
  }
  return problems;
}

// Environment file -> comparable shape.
export function normalizeDesiredEnvironment(file) {
  return {
    wait_timer: file.wait_timer ?? 0,
    prevent_self_review: file.prevent_self_review ?? false,
    reviewers: (file.reviewers ?? []).map((r) => `${r.type}:${r.login}`).sort(),
    deployment_branch_policy: file.deployment_branch_policy ?? null,
    branch_policies: (file.branch_policies ?? [])
      .map((p) => `${p.type ?? "branch"}:${p.name}`)
      .sort(),
  };
}

// GET environment response (+ its deployment branch policies) -> comparable shape.
export function normalizeLiveEnvironment(env, policies = []) {
  const rules = env?.protection_rules ?? [];
  const reviewerRule = rules.find((r) => r.type === "required_reviewers");
  const timerRule = rules.find((r) => r.type === "wait_timer");
  const policy = env?.deployment_branch_policy;
  return {
    wait_timer: timerRule?.wait_timer ?? 0,
    prevent_self_review: reviewerRule?.prevent_self_review ?? false,
    reviewers: (reviewerRule?.reviewers ?? []).map((r) => `${r.type}:${r.reviewer?.login}`).sort(),
    deployment_branch_policy: policy
      ? {
          protected_branches: policy.protected_branches,
          custom_branch_policies: policy.custom_branch_policies,
        }
      : null,
    branch_policies: policies.map((p) => `${p.type ?? "branch"}:${p.name}`).sort(),
  };
}

export function diffEnvironment(name, desiredFile, liveEnv, livePolicies) {
  if (!liveEnv) return [`environment "${name}" does not exist`];
  return diffValues(
    normalizeDesiredEnvironment(desiredFile),
    normalizeLiveEnvironment(liveEnv, livePolicies),
  ).map((line) => `environment ${name}: ${line}`);
}

// PUT body for an environment; `userIds` maps a reviewer login to its numeric ID.
export function environmentBody(file, userIds) {
  return {
    wait_timer: file.wait_timer ?? 0,
    prevent_self_review: file.prevent_self_review ?? false,
    reviewers: (file.reviewers ?? []).map((r) => {
      const id = userIds[r.login];
      if (!Number.isInteger(id)) throw new Error(`No user ID resolved for reviewer "${r.login}"`);
      return { type: r.type, id };
    }),
    deployment_branch_policy: file.deployment_branch_policy ?? null,
  };
}

// Deployment branch policies to create and delete so the live list equals the wanted one.
export function planBranchPolicies(desiredFile, livePolicies) {
  const key = (p) => `${p.type ?? "branch"}:${p.name}`;
  const wanted = desiredFile.branch_policies ?? [];
  const wantedKeys = new Set(wanted.map(key));
  const liveKeys = new Set(livePolicies.map(key));
  return {
    create: wanted.filter((p) => !liveKeys.has(key(p))),
    remove: livePolicies.filter((p) => !wantedKeys.has(key(p))),
  };
}

// Repo settings: only the keys named in the file are compared.
export function diffRepoSettings(desired, live) {
  const picked = {};
  for (const key of Object.keys(desired)) picked[key] = live?.[key];
  return diffValues(desired, picked).map((line) => `repo settings: ${line}`);
}

// Classic protection may be removed only when every required ruleset exists and is active.
export function classicRemovalProblems(requiredNames, liveRulesets) {
  const problems = [];
  for (const name of requiredNames) {
    const found = liveRulesets.find((r) => r.name === name);
    if (!found) problems.push(`ruleset "${name}" does not exist`);
    else if (found.enforcement !== "active") {
      problems.push(`ruleset "${name}" is "${found.enforcement}", not active`);
    }
  }
  return problems;
}
