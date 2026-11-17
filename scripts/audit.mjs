// Dependency audit gate: fails on a high or critical advisory unless
// `.github/audit-exceptions.json` lists it with a reason and an unexpired
// `reviewBy` date. Used by `npm run audit` and the CI "Dependency audit" job.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { evaluateAudit, parseExceptions } from "./lib/audit-gate.mjs";

function runAudit() {
  try {
    return execFileSync("npm", ["audit", "--json"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
    if (typeof error.stdout === "string" && error.stdout.trim().startsWith("{")) {
      return error.stdout;
    }
    throw error;
  }
}

const report = JSON.parse(runAudit());
if (report.error) {
  console.error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`);
  process.exit(1);
}

const exceptions = parseExceptions(
  JSON.parse(readFileSync(new URL("../.github/audit-exceptions.json", import.meta.url), "utf8")),
);
const today = new Date().toISOString().slice(0, 10);
const { blocking, excepted, expired, unused } = evaluateAudit(report, exceptions, today);

for (const a of excepted) {
  console.log(`excepted: ${a.id} ${a.name} (${a.severity}) until ${a.reviewBy}: ${a.reason}`);
}
for (const e of unused) {
  console.log(`unused exception: ${e.id} no longer appears in the audit; remove it`);
}
for (const a of expired) {
  console.error(`expired exception: ${a.id} ${a.name} (reviewBy ${a.reviewBy} has passed)`);
}
for (const a of blocking) {
  console.error(`blocking: ${a.id} ${a.name} (${a.severity}): ${a.title}`);
}

if (blocking.length > 0) {
  console.error(`${blocking.length} high or critical advisory(ies) block the audit.`);
  process.exit(1);
}
console.log(
  `Dependency audit passed: no unexcepted high or critical advisories (${excepted.length} excepted).`,
);
