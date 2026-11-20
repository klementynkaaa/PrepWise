// Schemas and cross-file rules for the knowledge base in `knowledge/`.
// The schemas check what is specific to the knowledge base (ids, copy, evidence, sources and
// references). An item's app fields (placement, unit, amount, ...) are passed through loosely:
// `src/lib/plan/types.ts` stays the one definition of the item shape, checked by `tsc` through
// `satisfies` on the generated file.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const id = z.string().regex(KEBAB, "must be kebab-case");
const text = z.string().min(1, "must not be empty");
const isoDate = z.string().regex(ISO_DATE, "must be an ISO date (YYYY-MM-DD)");
const httpsUrl = z.url().refine((u) => u.startsWith("https://"), "must be an https URL");

const sourceSchema = z.strictObject({
  id,
  kind: z.enum(["official", "other"]),
  url: httpsUrl,
  archivedUrl: httpsUrl.optional(),
  edition: text.optional(),
  accessedAt: isoDate,
  copy: z.strictObject({ title: text, publisher: text }),
});

const evidenceSchema = z.strictObject({
  sourceId: id,
  quote: z.string(),
  page: z.union([z.number().int().positive(), text]).optional(),
  section: text.optional(),
  verifiedBy: z.literal("owner").optional(),
  verifiedAt: isoDate.optional(),
});

const itemSchema = z
  .looseObject({
    id,
    placement: z.looseObject({}),
    unit: z.string(),
    amount: z.looseObject({}),
    roundStep: z.number().positive(),
    when: z.looseObject({}).optional(),
    intendedSource: z.string(),
    copy: z.strictObject({
      name: text,
      listName: text,
      note: text.optional(),
      why: text.optional(),
    }),
    evidence: evidenceSchema.optional(),
  })
  .superRefine((item, ctx) => {
    for (const key of ["verified", "sourceRef"]) {
      if (key in item)
        ctx.addIssue({ code: "custom", path: [key], message: "is derived; remove it" });
    }
  });

// Phase 3 adds the scenario schema. Until then the file must be an empty array.
const emergenciesSchema = z.array(z.never());

const FILES = {
  sources: ["sources.json", z.array(sourceSchema)],
  items: ["items.json", z.array(itemSchema)],
  emergencies: ["emergencies.json", emergenciesSchema],
};

function formatIssue(file, data, issue) {
  const [index, ...rest] = issue.path;
  const entry = typeof index === "number" ? data?.[index] : undefined;
  const slug = entry && typeof entry.id === "string" ? ` [${entry.id}]` : "";
  const where = typeof index === "number" ? `#${index}${slug}` : "";
  const field = rest.length ? ` field "${rest.join(".")}"` : "";
  return `knowledge/${file} ${where}${field}: ${issue.message}`.replace(/\s+:/, ":");
}

/** Reads and schema-checks the knowledge files in `dir`. Throws one error listing every problem. */
export function loadKnowledge(dir) {
  const result = {};
  const problems = [];
  for (const [name, [file, schema]] of Object.entries(FILES)) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(dir, file), "utf8"));
    } catch (error) {
      problems.push(`knowledge/${file}: cannot read as JSON (${error.message})`);
      continue;
    }
    const parsed = schema.safeParse(data);
    if (parsed.success) result[name] = parsed.data;
    else problems.push(...parsed.error.issues.map((issue) => formatIssue(file, data, issue)));
  }
  if (problems.length) throw new Error(problems.join("\n"));
  return result;
}

/** Whether `url` is an https URL on gov.pl or one of its subdomains. */
export function isGovPlUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && (hostname === "gov.pl" || hostname.endsWith(".gov.pl"));
  } catch {
    return false;
  }
}

/** The evidence is complete and owner-verified (the shape is checked by `checkRules`). */
export function isOwnerVerified(evidence) {
  return (
    evidence?.verifiedBy === "owner" &&
    Boolean(evidence.quote?.trim()) &&
    Boolean(evidence.verifiedAt)
  );
}

function duplicates(file, entries, problems) {
  const seen = new Set();
  for (const { id: entryId } of entries) {
    if (seen.has(entryId)) problems.push(`knowledge/${file} [${entryId}]: duplicate id`);
    seen.add(entryId);
  }
}

function checkEvidence(file, entry, sourcesById, today, problems) {
  const { evidence } = entry;
  if (!evidence) return;
  const at = (field, message) =>
    problems.push(`knowledge/${file} [${entry.id}] field "evidence.${field}": ${message}`);
  const source = sourcesById.get(evidence.sourceId);
  if (!source) at("sourceId", `unknown source "${evidence.sourceId}"`);
  if (evidence.verifiedBy === undefined) return; // a draft
  if (!evidence.quote.trim()) at("quote", "required when verifiedBy is set");
  if (!evidence.verifiedAt) at("verifiedAt", "required when verifiedBy is set");
  else if (evidence.verifiedAt > today) at("verifiedAt", "must not be in the future");
  if (!source) return;
  if (!source.archivedUrl) {
    at("sourceId", `owner-verified, so source "${source.id}" needs an archivedUrl`);
  }
  if (entry.intendedSource === "official" && source.kind !== "official") {
    problems.push(
      `knowledge/${file} [${entry.id}]: intendedSource is "official" but source "${source.id}" is kind "other"`,
    );
  }
}

/** Cross-file rules. Returns readable problems; an empty array means the knowledge base is valid. */
export function checkRules(kb, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const problems = [];
  duplicates("sources.json", kb.sources, problems);
  duplicates("items.json", kb.items, problems);
  duplicates("emergencies.json", kb.emergencies, problems);
  const sourcesById = new Map(kb.sources.map((source) => [source.id, source]));
  for (const source of kb.sources) {
    if (source.kind === "official" && !isGovPlUrl(source.url)) {
      problems.push(
        `knowledge/sources.json [${source.id}] field "url": an official source needs an https URL on gov.pl`,
      );
    }
  }
  for (const item of kb.items) checkEvidence("items.json", item, sourcesById, today, problems);
  return problems;
}
