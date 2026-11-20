// Generates the bundled plan content from `knowledge/`:
//   src/lib/plan/content.generated.ts  ids, numbers, URLs and enums only (no Polish text)
//   messages/pl.knowledge.json         every Polish word (item copy, source titles, publishers)
// Usage: node scripts/build-knowledge.mjs [--check]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import { checkRules, isOwnerVerified, loadKnowledge } from "./lib/knowledge.mjs";

export const TS_OUTPUT = "src/lib/plan/content.generated.ts";
export const MESSAGES_OUTPUT = "messages/pl.knowledge.json";

const HEADER =
  "// GENERATED from knowledge/ by scripts/build-knowledge.mjs. Do not edit: change `knowledge/`\n" +
  "// and run `npm run knowledge`.\n";

/** Whether the item's evidence is complete, owner-verified and cites an official source. */
function isVerified(item, sourcesById) {
  return (
    Boolean(item.evidence) &&
    isOwnerVerified(item.evidence) &&
    sourcesById.get(item.evidence.sourceId)?.kind === "official"
  );
}

/** Builds the unformatted contents of both outputs from a valid knowledge base. */
export function generate(kb) {
  const sourcesById = new Map(kb.sources.map((source) => [source.id, source]));

  const sources = kb.sources.map(({ id, kind, url, archivedUrl, edition }) => ({
    id,
    kind,
    url,
    ...(archivedUrl !== undefined ? { archivedUrl } : {}),
    ...(edition !== undefined ? { edition } : {}),
  }));

  const items = kb.items.map((item) => {
    const { evidence, ...app } = item;
    delete app.copy;
    const verified = isVerified(item, sourcesById);
    // A verified item carries the source its evidence cites.
    return verified ? { ...app, verified, sourceId: evidence.sourceId } : { ...app, verified };
  });

  const ts =
    `${HEADER}\n` +
    `import type { PlanItem, RegisterSource } from "./types";\n\n` +
    `export const SOURCES = ${JSON.stringify(sources)} as const satisfies readonly RegisterSource[];\n\n` +
    `export type SourceId = (typeof SOURCES)[number]["id"];\n\n` +
    `export const PLAN_ITEMS = ${JSON.stringify(items)} satisfies readonly PlanItem[];\n`;

  const messages = {
    plan: {
      items: Object.fromEntries(kb.items.map((item) => [item.id, item.copy])),
      sourceRegister: Object.fromEntries(kb.sources.map((source) => [source.id, source.copy])),
    },
  };

  return { [TS_OUTPUT]: ts, [MESSAGES_OUTPUT]: `${JSON.stringify(messages)}\n` };
}

async function format(rootDir, relPath, text) {
  const path = join(rootDir, relPath);
  const config = await prettier.resolveConfig(path);
  return prettier.format(text, { ...config, filepath: path });
}

/**
 * Validates the knowledge base under `rootDir`, then writes the outputs, or with `check`
 * compares them with the files on disk. Returns `{ ok, problems }`.
 */
export async function run({ check = false, rootDir = process.cwd() } = {}) {
  let kb;
  try {
    kb = loadKnowledge(join(rootDir, "knowledge"));
  } catch (error) {
    return { ok: false, problems: error.message.split("\n") };
  }
  const problems = checkRules(kb);
  if (problems.length) return { ok: false, problems };

  const outputs = generate(kb);
  for (const [relPath, text] of Object.entries(outputs)) {
    const formatted = await format(rootDir, relPath, text);
    const path = join(rootDir, relPath);
    if (check) {
      const onDisk = existsSync(path) ? readFileSync(path, "utf8") : null;
      if (onDisk !== formatted) problems.push(`${relPath} is stale; run \`npm run knowledge\``);
    } else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, formatted);
    }
  }
  return { ok: problems.length === 0, problems };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const { ok, problems } = await run({ check });
  if (!ok) {
    for (const problem of problems) console.error(problem);
    if (!check || problems.every((p) => !p.endsWith("run `npm run knowledge`"))) {
      console.error("Fix the knowledge base, then run `npm run knowledge`.");
    }
    process.exit(1);
  }
  console.log(
    check ? "Knowledge base and generated files are up to date." : "Generated knowledge files.",
  );
}
