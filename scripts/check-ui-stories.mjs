// Checks that a changed UI component comes with a story. Reads BASE_REF and PR_LABELS
// (a JSON array of label names) from the environment; needs full git history.
import { execFileSync } from "node:child_process";
import { checkUiStories } from "./lib/ui-rules.mjs";

const baseRef = process.env.BASE_REF;
const labels = JSON.parse(process.env.PR_LABELS || "[]");

const changedFiles = execFileSync(
  "git",
  ["diff", "--name-only", "--diff-filter=AMR", `origin/${baseRef}...HEAD`],
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean);

const failures = checkUiStories({ changedFiles, labels });
if (failures.length > 0) {
  for (const failure of failures) console.error(`::error::${failure}`);
  process.exit(1);
}
console.log("UI stories: ok");
