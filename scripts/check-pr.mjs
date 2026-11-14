// Checks PR conventions. Reads PR_TITLE, HEAD_REF and BASE_REF from the environment.
import { checkPullRequest } from "./lib/pr-rules.mjs";

const failures = checkPullRequest({
  title: process.env.PR_TITLE,
  headRef: process.env.HEAD_REF,
  baseRef: process.env.BASE_REF,
});

if (failures.length > 0) {
  for (const failure of failures) console.error(`::error::${failure}`);
  process.exit(1);
}
console.log("PR conventions: ok");
