#!/usr/bin/env node
// Sync context/foundation/roadmap.md with GitHub issues.
//
// The roadmap is git-ignored, so this runs locally (by hand, or from the
// Claude Code hook after the roadmap is edited), never in CI.
//
// Ownership rules:
//   - The roadmap owns WHAT: titles, descriptions, labels, prerequisites,
//     the milestone, and the planning statuses (proposed, ready, blocked).
//   - GitHub owns PROGRESS: an issue moves to in-progress when a PR for its
//     change is opened, and is closed when that PR is merged
//     (.github/workflows/roadmap-issues.yml). This script writes that
//     progress back into the roadmap as "in-progress" / "done".
//
// Only the roadmap items are published. Open questions, parked ideas and the
// vision stay local, because the repository and its issues are public.
//
// Usage: node scripts/sync-roadmap-issues.mjs [--dry-run] [--show-body] [--roadmap <path>]

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SHOW_BODY = args.includes("--show-body");
const roadmapArg = args.indexOf("--roadmap");
const ROADMAP_PATH = resolve(
  roadmapArg >= 0 ? args[roadmapArg + 1] : "context/foundation/roadmap.md",
);

const MANAGED_LABEL = "roadmap";
const STATUS_VALUES = ["proposed", "ready", "in-progress", "blocked", "done"];

const LABELS = {
  [MANAGED_LABEL]: ["0e8a16", "Tracked in the product roadmap; synced automatically"],
  "type: foundation": [
    "5319e7",
    "Groundwork other work depends on (CI, design system, release flow)",
  ],
  "type: slice": ["1d76db", "A user-visible, end-to-end piece of the product"],
  "north star": ["fbca04", "The slice that proves the product works"],
  "status: proposed": ["ededed", "On the roadmap; not ready to plan yet"],
  "status: ready": ["c2e0c6", "Prerequisites met; ready to plan and build"],
  "status: in-progress": ["0052cc", "A pull request for this change is open"],
  "status: blocked": ["b60205", "Waiting on a blocker or an open decision"],
};
const STREAM_COLOR = "bfd4f2";

// ---------------------------------------------------------------- parsing

function parseRoadmap(text) {
  const fm = {};
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    for (const line of fmMatch[1].split("\n")) {
      const m = line.match(/^(\w+):\s*([^#]*?)\s*(#.*)?$/);
      if (m) fm[m[1]] = m[2];
    }
  }

  const milestoneMatch = text.match(/^\*\*(M-\d+): (.+?)\*\*/m);
  const intent = text.match(/^- \*\*Intent:\*\* (.+)$/m)?.[1] ?? "";
  const milestone = milestoneMatch
    ? {
        title: `${milestoneMatch[1]}: ${milestoneMatch[2]}`,
        description: intent,
        done: fm.milestone_status === "done",
      }
    : null;

  const northStar = text.match(/## North star\s+\*\*(\w-\d+):/)?.[1];

  // Streams: | A | Theme | `F-01` → `S-01` ... |
  const streams = {};
  const streamSection = section(text, "## Streams");
  for (const row of tableRows(streamSection)) {
    const [letter, theme, chain] = row;
    if (!/^[A-Z]$/.test(letter)) continue;
    for (const id of chain.match(/[FS]-\d+/g) ?? []) {
      streams[id] ??= `stream: ${letter} · ${theme.toLowerCase()}`;
    }
  }

  // Suggested issue titles from the Backlog Handoff table.
  const titles = {};
  for (const row of tableRows(section(text, "## Backlog Handoff"))) {
    if (/^[FS]-\d+$/.test(row[0])) titles[row[0]] = row[2];
  }

  const items = [];
  const re = /^### ([FS]-\d+): (.+)$/gm;
  const heads = [...text.matchAll(re)];
  heads.forEach((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].index : nextH2(text, h.index);
    const block = text.slice(h.index, end);
    const field = (name) => {
      const m = block.match(new RegExp(`^- \\*\\*${name}:\\*\\*[ \\t]*(.*)$`, "m"));
      return m ? m[1].trim() : "";
    };
    const subList = (name) => {
      const m = block.match(new RegExp(`^- \\*\\*${name}:\\*\\*\\s*\\n((?:  - .*\\n?)+)`, "m"));
      return m
        ? m[1]
            .split("\n")
            .map((l) => l.replace(/^  - /, "").trim())
            .filter(Boolean)
        : [];
    };
    const id = h[1];
    const status = field("Status").toLowerCase();
    if (!STATUS_VALUES.includes(status)) {
      throw new Error(`${id}: unknown status "${status}" (expected ${STATUS_VALUES.join(", ")})`);
    }
    const unknowns = subList("Unknowns");
    items.push({
      id,
      name: h[2].trim(),
      kind: id.startsWith("F") ? "foundation" : "slice",
      title: `[${id}] ${titles[id] ?? h[2].trim()}`,
      outcome: field("Outcome"),
      changeId: field("Change ID"),
      prdRefs: field("PRD refs"),
      unlocks: field("Unlocks"),
      prerequisites: field("Prerequisites"),
      parallelWith: field("Parallel with"),
      blockers: field("Blockers"),
      unknowns:
        unknowns.length || ["", "—"].includes(field("Unknowns")) ? unknowns : [field("Unknowns")],
      risk: field("Risk"),
      status,
      stream: streams[id],
      northStar: id === northStar,
    });
  });

  return { fm, milestone, items };
}

function section(text, heading) {
  const start = text.indexOf(`\n${heading}\n`);
  if (start < 0) return "";
  return text.slice(start, nextH2(text, start + 1));
}

function nextH2(text, from) {
  const m = /\n## /g;
  m.lastIndex = from + 1;
  const hit = m.exec(text);
  return hit ? hit.index : text.length;
}

function tableRows(md) {
  return md
    .split("\n")
    .filter((l) => l.startsWith("|") && !/^\|[\s-:|]+\|$/.test(l))
    .map((l) =>
      l
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim()),
    );
}

// ---------------------------------------------------------------- github

function gh(argv, { input, json = true } = {}) {
  const out = execFileSync("gh", argv, {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return json && out.trim() ? JSON.parse(out) : out;
}

function repoSlug() {
  return gh(["repo", "view", "--json", "nameWithOwner"]).nameWithOwner;
}

function marker(item) {
  return `<!-- roadmap-id: ${item.id} -->`;
}

function findManagedIssues(repo) {
  const issues = gh([
    "api",
    "--paginate",
    `repos/${repo}/issues?state=all&labels=${encodeURIComponent(MANAGED_LABEL)}&per_page=100`,
  ]);
  const byId = {};
  for (const issue of issues.flat()) {
    if (issue.pull_request) continue;
    const id = issue.body?.match(/<!-- roadmap-id: ([FS]-\d+) -->/)?.[1];
    if (id) byId[id] = issue;
  }
  return byId;
}

function linkIds(text, numbers) {
  return text.replace(/\b([FS]-\d+)\b/g, (id) => (numbers[id] ? `#${numbers[id]} (${id})` : id));
}

function renderBody(item, numbers) {
  const branchPrefix = item.kind === "foundation" ? "chore" : "feature";
  const lines = [
    marker(item),
    `<!-- change-id: ${item.changeId} -->`,
    "> [!NOTE]",
    "> Synced from the product roadmap. Edit the roadmap, not this description: changes made here are overwritten on the next sync.",
    "",
    "## Outcome",
    "",
    item.outcome,
    "",
    "## Details",
    "",
    `| | |`,
    `| --- | --- |`,
    `| Roadmap ID | ${item.id}${item.northStar ? " (north star)" : ""} |`,
    `| Change ID | \`${item.changeId}\` |`,
    `| Branch | \`${branchPrefix}/${item.changeId}\` (or any \`<type>/${item.changeId}\`) |`,
    `| PRD refs | ${item.prdRefs || "—"} |`,
    `| Prerequisites | ${linkIds(item.prerequisites || "—", numbers)} |`,
    `| Parallel with | ${linkIds(item.parallelWith || "—", numbers)} |`,
  ];
  if (item.unlocks) lines.push(`| Unlocks | ${linkIds(item.unlocks, numbers)} |`);
  if (item.blockers && item.blockers !== "—")
    lines.push(`| Blockers | ${linkIds(item.blockers, numbers)} |`);
  if (item.unknowns.length) {
    lines.push("", "## Open questions", "", ...item.unknowns.map((u) => `- [ ] ${u}`));
  }
  if (item.risk) lines.push("", "## Risk", "", item.risk);
  lines.push(
    "",
    "## Done when",
    "",
    `- [ ] A pull request from \`<type>/${item.changeId}\` (or one that says \`Closes #<this issue>\`) is merged into \`develop\`.`,
    "- [ ] All CI checks pass on that pull request.",
    "- [ ] `docs/` is updated if the change alters what it describes.",
    "",
  );
  return lines.join("\n");
}

function labelsFor(item) {
  const labels = [MANAGED_LABEL, `type: ${item.kind}`];
  if (item.status !== "done") labels.push(`status: ${item.status}`);
  if (item.blockers && item.blockers !== "—" && item.status !== "done")
    labels.push("status: blocked");
  if (item.stream) labels.push(item.stream);
  if (item.northStar) labels.push("north star");
  return [...new Set(labels)];
}

// ---------------------------------------------------------------- write-back

// GitHub owns progress: write "in-progress" and "done" back into the roadmap.
function progressFromIssue(issue) {
  if (!issue) return null;
  if (issue.state === "closed") return issue.state_reason === "completed" ? "done" : null;
  if (issue.labels.some((l) => l.name === "status: in-progress")) return "in-progress";
  return null;
}

function writeStatus(text, id, status) {
  // Detail section: "- **Status:** ready" under "### F-01: ..."
  const head = text.search(new RegExp(`^### ${id}: `, "m"));
  if (head >= 0) {
    const tail = text.slice(head);
    const fixed = tail.replace(/^(- \*\*Status:\*\* )\S+/m, `$1${status}`);
    text = text.slice(0, head) + fixed;
  }
  // "At a glance" row: last cell. Keep the column width when it fits.
  text = text.replace(
    new RegExp(`^(\\| ${id} +\\|.*\\| )(\\S+)( *)\\|$`, "m"),
    (_, pre, old, pad) => {
      const width = old.length + pad.length;
      return `${pre}${status.padEnd(width)} |`;
    },
  );
  return text;
}

// ---------------------------------------------------------------- main

function main() {
  if (!existsSync(ROADMAP_PATH)) {
    console.log(`roadmap sync: ${ROADMAP_PATH} not found; nothing to sync.`);
    return;
  }
  let text = readFileSync(ROADMAP_PATH, "utf8");
  const { milestone, items } = parseRoadmap(text);
  if (!items.length) {
    console.log("roadmap sync: no F-NN / S-NN items found.");
    return;
  }

  const repo = repoSlug();
  const tag = DRY_RUN ? "[dry-run] " : "";
  const run = (desc, fn) => {
    console.log(`${tag}${desc}`);
    return DRY_RUN ? undefined : fn();
  };

  // 1. Labels (create or update colour/description).
  const wanted = { ...LABELS };
  for (const item of items)
    if (item.stream)
      wanted[item.stream] = [
        STREAM_COLOR,
        "Roadmap stream: items that share a prerequisites chain",
      ];
  const existing = new Map(
    gh(["label", "list", "--limit", "500", "--json", "name,color,description"]).map((l) => [
      l.name,
      l,
    ]),
  );
  for (const [name, [color, description]] of Object.entries(wanted)) {
    const cur = existing.get(name);
    if (cur && cur.color.toLowerCase() === color && cur.description === description) continue;
    run(`label ${cur ? "update" : "create"}: ${name}`, () =>
      gh(["label", "create", name, "--color", color, "--description", description, "--force"], {
        json: false,
      }),
    );
  }

  // 2. Milestone.
  let milestoneTitle;
  if (milestone) {
    const all = gh(["api", `repos/${repo}/milestones?state=all&per_page=100`]);
    const cur = all.find((m) => m.title.split(":")[0] === milestone.title.split(":")[0]);
    const state = milestone.done ? "closed" : "open";
    milestoneTitle = milestone.title;
    if (!cur) {
      run(`milestone create: ${milestone.title}`, () =>
        gh([
          "api",
          "-X",
          "POST",
          `repos/${repo}/milestones`,
          "-f",
          `title=${milestone.title}`,
          "-f",
          `description=${milestone.description}`,
          "-f",
          `state=${state}`,
        ]),
      );
    } else if (
      cur.title !== milestone.title ||
      cur.description !== milestone.description ||
      cur.state !== state
    ) {
      run(`milestone update: ${milestone.title}`, () =>
        gh([
          "api",
          "-X",
          "PATCH",
          `repos/${repo}/milestones/${cur.number}`,
          "-f",
          `title=${milestone.title}`,
          "-f",
          `description=${milestone.description}`,
          "-f",
          `state=${state}`,
        ]),
      );
    }
  }

  // 3. Pull progress from GitHub into the roadmap.
  let issues = findManagedIssues(repo);
  let roadmapChanged = false;
  for (const item of items) {
    const progress = progressFromIssue(issues[item.id]);
    if (
      progress &&
      progress !== item.status &&
      !(progress === "in-progress" && item.status === "done")
    ) {
      console.log(`${tag}roadmap: ${item.id} ${item.status} → ${progress} (from GitHub)`);
      item.status = progress;
      text = writeStatus(text, item.id, progress);
      roadmapChanged = true;
    }
  }
  if (roadmapChanged && !DRY_RUN) writeFileSync(ROADMAP_PATH, text);

  // 4. Create missing issues first, so every body can link to the others.
  const numbers = Object.fromEntries(Object.entries(issues).map(([id, i]) => [id, i.number]));
  for (const item of items) {
    if (issues[item.id]) continue;
    run(`issue create: ${item.title}`, () => {
      const url = gh(
        [
          "issue",
          "create",
          "--title",
          item.title,
          "--body-file",
          "-",
          "--label",
          MANAGED_LABEL,
          ...(milestoneTitle ? ["--milestone", milestoneTitle] : []),
        ],
        { input: marker(item), json: false },
      ).trim();
      numbers[item.id] = Number(url.split("/").pop());
    });
  }
  if (!DRY_RUN) issues = findManagedIssues(repo);

  // 5. Update every issue: title, body, labels, milestone, open/closed, dependencies.
  for (const item of items) {
    const issue = issues[item.id];
    const number = issue?.number ?? numbers[item.id] ?? "(new)";
    const body = renderBody(item, numbers);
    if (SHOW_BODY) console.log(`\n----- ${item.id}\n${body}`);
    const want = labelsFor(item);
    const have = (issue?.labels ?? []).map((l) => l.name);
    const managedHave = have.filter(
      (l) =>
        l === MANAGED_LABEL ||
        l.startsWith("type: ") ||
        l.startsWith("status: ") ||
        l.startsWith("stream: ") ||
        l === "north star",
    );
    const add = want.filter((l) => !have.includes(l));
    const remove = managedHave.filter((l) => !want.includes(l));

    const edits = [];
    if (!issue || issue.title !== item.title) edits.push("--title", item.title);
    if (!issue || (issue.body ?? "").trim() !== body.trim()) edits.push("--body-file", "-");
    for (const l of add) edits.push("--add-label", l);
    for (const l of remove) edits.push("--remove-label", l);
    if (milestoneTitle && issue?.milestone?.title !== milestoneTitle)
      edits.push("--milestone", milestoneTitle);
    if (edits.length) {
      run(`issue #${number} ${item.id}: update ${summarise(edits)}`, () =>
        gh(["issue", "edit", String(number), ...edits], { input: body, json: false }),
      );
    }

    const shouldBeClosed = item.status === "done";
    if (issue && shouldBeClosed && issue.state === "open") {
      run(`issue #${number} ${item.id}: close (roadmap says done)`, () =>
        gh(["issue", "close", String(number), "--reason", "completed"], { json: false }),
      );
    } else if (issue && !shouldBeClosed && issue.state === "closed") {
      run(`issue #${number} ${item.id}: reopen (roadmap says ${item.status})`, () =>
        gh(["issue", "reopen", String(number)], { json: false }),
      );
    }

    syncDependencies(repo, item, issues, run);
  }

  console.log(`${tag}roadmap sync: ${items.length} items checked.`);
}

function summarise(edits) {
  const parts = [];
  if (edits.includes("--title")) parts.push("title");
  if (edits.includes("--body-file")) parts.push("body");
  const labels = edits
    .filter((_, i) => edits[i - 1] === "--add-label")
    .map((l) => `+${l}`)
    .concat(edits.filter((_, i) => edits[i - 1] === "--remove-label").map((l) => `-${l}`));
  if (labels.length) parts.push(`labels ${labels.join(" ")}`);
  if (edits.includes("--milestone")) parts.push("milestone");
  return parts.join(", ");
}

// Native "blocked by" links (GitHub issue dependencies) from Prerequisites.
function syncDependencies(repo, item, issues, run) {
  const issue = issues[item.id];
  if (!issue) return;
  const prereqIds = item.prerequisites.match(/[FS]-\d+/g) ?? [];
  const wanted = prereqIds.map((id) => issues[id]).filter(Boolean);
  let current = [];
  try {
    current = gh(["api", `repos/${repo}/issues/${issue.number}/dependencies/blocked_by`]);
  } catch {
    return; // dependencies API unavailable; the body still links prerequisites
  }
  const currentIds = new Set(current.map((i) => i.id));
  for (const dep of wanted) {
    if (currentIds.has(dep.id)) continue;
    run(`issue #${issue.number} ${item.id}: blocked by #${dep.number}`, () =>
      gh([
        "api",
        "-X",
        "POST",
        `repos/${repo}/issues/${issue.number}/dependencies/blocked_by`,
        "-F",
        `issue_id=${dep.id}`,
      ]),
    );
  }
  const wantedIds = new Set(wanted.map((d) => d.id));
  for (const dep of current) {
    if (wantedIds.has(dep.id) || !Object.values(issues).some((i) => i.id === dep.id)) continue;
    run(`issue #${issue.number} ${item.id}: no longer blocked by #${dep.number}`, () =>
      gh([
        "api",
        "-X",
        "DELETE",
        `repos/${repo}/issues/${issue.number}/dependencies/blocked_by/${dep.id}`,
      ]),
    );
  }
}

try {
  main();
} catch (err) {
  console.error(`roadmap sync failed: ${err.stderr?.toString().trim() || err.message}`);
  process.exit(1);
}
