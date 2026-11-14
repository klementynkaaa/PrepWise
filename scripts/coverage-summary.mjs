// Prints a Markdown coverage table from coverage/coverage-summary.json.
// In CI: node scripts/coverage-summary.mjs >> "$GITHUB_STEP_SUMMARY"
import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "coverage/coverage-summary.json";
const summary = JSON.parse(readFileSync(path, "utf8"));

const row = (label, s) =>
  `| ${label} | ${s.lines.pct}% | ${s.statements.pct}% | ${s.functions.pct}% | ${s.branches.pct}% |`;

const lines = [
  "## Coverage (src/lib)",
  "",
  "| File | Lines | Statements | Functions | Branches |",
  "| --- | --- | --- | --- | --- |",
];
for (const [file, stats] of Object.entries(summary)) {
  if (file === "total") continue;
  lines.push(row(file.replace(`${process.cwd()}/`, ""), stats));
}
lines.push(row("**Total**", summary.total));
console.log(lines.join("\n"));
