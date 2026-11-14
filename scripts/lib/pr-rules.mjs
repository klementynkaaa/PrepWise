// Pure PR convention rules, used by scripts/check-pr.mjs and scripts/is-hotfix.mjs.

const TITLE = /^(feat|fix|chore|docs|refactor|test|ci|perf|build|revert)(\([a-z0-9-]+\))?!?: \S.*$/;
const KEBAB = "[a-z0-9]+(-[a-z0-9]+)*";
const WORK_BRANCH = new RegExp(`^(feature|bugfix|refactor|chore|docs|hotfix)/${KEBAB}$`);
const HOTFIX_BRANCH = new RegExp(`^hotfix/${KEBAB}$`);

export const TITLE_EXPECTED =
  "<type>(<optional-scope>)!: <subject>, with type one of feat, fix, chore, docs, refactor, test, ci, perf, build, revert";
export const BRANCH_EXPECTED =
  "<prefix>/<kebab-case-name>, with prefix one of feature, bugfix, refactor, chore, docs, hotfix";

export function isValidTitle(title) {
  return TITLE.test(title ?? "");
}

export function isWorkBranch(ref) {
  return WORK_BRANCH.test(ref ?? "");
}

// True for `hotfix/<kebab-case>` only.
export function isHotfixHead(ref) {
  return HOTFIX_BRANCH.test(ref ?? "");
}

// Whether `head` may be merged into `base`.
export function isAllowedSource(head, base) {
  if (base === "develop") return (isWorkBranch(head) && !isHotfixHead(head)) || head === "main";
  if (base === "main") return head === "develop" || isHotfixHead(head);
  return false;
}

function allowedSourceText(base) {
  if (base === "develop") {
    return "feature/, bugfix/, refactor/, chore/ or docs/ branches, or main (sync PR)";
  }
  if (base === "main") return "develop (release PR) or hotfix/<kebab-case>";
  return "none (only develop and main are supported base branches)";
}

// Returns a list of human-readable failures; empty means the PR is fine.
export function checkPullRequest({ title, headRef, baseRef }) {
  const failures = [];
  if (!isValidTitle(title)) {
    failures.push(
      `PR title "${title ?? ""}" is not a Conventional Commit. Expected: ${TITLE_EXPECTED}.`,
    );
  }
  // The sync PR (main -> develop) and release PR (develop -> main) use fixed branch names.
  const fixedHead = headRef === "main" || headRef === "develop";
  if (!fixedHead && !isWorkBranch(headRef)) {
    failures.push(`Branch name "${headRef ?? ""}" is not allowed. Expected: ${BRANCH_EXPECTED}.`);
  }
  if (!isAllowedSource(headRef, baseRef)) {
    failures.push(
      `Branch "${headRef ?? ""}" cannot be merged into "${baseRef ?? ""}". Allowed sources: ${allowedSourceText(baseRef)}.`,
    );
  }
  return failures;
}
