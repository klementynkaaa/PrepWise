import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generate, run } from "./build-knowledge.mjs";
import { checkRules, loadKnowledge } from "./lib/knowledge.mjs";

const official = {
  id: "guide",
  kind: "official",
  url: "https://www.gov.pl/web/guide",
  archivedUrl: "https://web.archive.org/web/2026/https://www.gov.pl/web/guide",
  accessedAt: "2026-11-20",
  copy: { title: "T", publisher: "P" },
};
const other = { ...official, id: "blog", kind: "other", url: "https://example.com/blog" };

const evidence = {
  sourceId: "guide",
  quote: "3 litry na osobę",
  verifiedBy: "owner",
  verifiedAt: "2026-11-01",
};

function item(overrides = {}) {
  return {
    id: "water",
    placement: { kind: "tier", tier: 1, category: "waterFood" },
    unit: "l",
    amount: { fixed: 1 },
    roundStep: 1,
    intendedSource: "official",
    copy: { name: "Woda", listName: "Woda" },
    ...overrides,
  };
}

const scenario = (overrides = {}) => ({
  id: "blackout",
  copy: { name: "Brak prądu", explanation: "Opis" },
  intendedSource: "official",
  items: ["candle"],
  ...overrides,
});
const candle = (overrides = {}) =>
  item({
    id: "candle",
    intendedSource: "prepwise",
    when: { emergency: "blackout" },
    copy: { name: "Świeczka", listName: "Świeczka" },
    ...overrides,
  });

const kb = (overrides = {}) => ({
  sources: [official, other],
  items: [item({ evidence })],
  emergencies: [],
  ...overrides,
});

const today = "2026-11-21";

describe("checkRules", () => {
  it("accepts a draft and an owner-verified item", () => {
    expect(checkRules(kb(), { today })).toEqual([]);
    expect(checkRules(kb({ items: [item()] }), { today })).toEqual([]);
    expect(
      checkRules(kb({ items: [item({ evidence: { sourceId: "guide", quote: "" } })] }), { today }),
    ).toEqual([]);
  });

  it("rejects a duplicate slug and names it", () => {
    const problems = checkRules(kb({ items: [item(), item()] }), { today });
    expect(problems).toEqual(["knowledge/items.json [water]: duplicate id"]);
  });

  it("rejects evidence with an unknown source", () => {
    const problems = checkRules(
      kb({ items: [item({ evidence: { ...evidence, sourceId: "nope" } })] }),
      { today },
    );
    expect(problems.join("\n")).toContain(
      '[water] field "evidence.sourceId": unknown source "nope"',
    );
  });

  it("rejects a verifiedBy other than owner (schema)", () => {
    const dir = temp();
    writeKnowledge(dir, kb({ items: [item({ evidence: { ...evidence, verifiedBy: "bot" } })] }));
    expect(() => loadKnowledge(join(dir, "knowledge"))).toThrow(
      /items\.json #0 \[water\] field "evidence\.verifiedBy"/,
    );
  });

  it("rejects owner-verified evidence without a quote or a date", () => {
    const noQuote = checkRules(kb({ items: [item({ evidence: { ...evidence, quote: "  " } })] }), {
      today,
    });
    expect(noQuote.join("\n")).toContain('field "evidence.quote"');
    const noDate = { ...evidence, verifiedAt: undefined };
    const problems = checkRules(kb({ items: [item({ evidence: noDate })] }), { today });
    expect(problems.join("\n")).toContain('field "evidence.verifiedAt": required');
  });

  it("rejects a verification date in the future", () => {
    const problems = checkRules(
      kb({ items: [item({ evidence: { ...evidence, verifiedAt: "2027-01-01" } })] }),
      { today },
    );
    expect(problems.join("\n")).toContain("must not be in the future");
  });

  it("rejects an official source that is not on gov.pl", () => {
    for (const url of ["https://example.com/x", "https://notgov.pl/x", "http://www.gov.pl/x"]) {
      const problems = checkRules(kb({ sources: [{ ...official, url }, other] }), { today });
      expect(problems.join("\n")).toContain('[guide] field "url"');
    }
    const subdomain = { ...official, url: "https://rcb.gov.pl/x" };
    expect(checkRules(kb({ sources: [subdomain, other] }), { today })).toEqual([]);
  });

  it("rejects owner-verified evidence whose source has no archivedUrl", () => {
    const bare = { ...official, archivedUrl: undefined };
    const problems = checkRules(kb({ sources: [bare, other] }), { today });
    expect(problems.join("\n")).toContain("needs an archivedUrl");
  });

  it("rejects official intent verified against a kind other source", () => {
    const problems = checkRules(
      kb({ items: [item({ evidence: { ...evidence, sourceId: "blog" } })] }),
      { today },
    );
    expect(problems.join("\n")).toContain('[water]: intendedSource is "official"');
    const prepwise = item({
      intendedSource: "prepwise",
      evidence: { ...evidence, sourceId: "blog" },
    });
    expect(checkRules(kb({ items: [prepwise] }), { today })).toEqual([]);
  });
});

describe("checkRules: scenarios", () => {
  const withScenario = (overrides = {}, items = [item(), candle()]) =>
    kb({ items, emergencies: [scenario(overrides)] });

  it("accepts a scenario and the item it adds", () => {
    expect(checkRules(withScenario(), { today })).toEqual([]);
  });

  it("rejects a listed item that does not exist", () => {
    const problems = checkRules(withScenario({ items: ["candle", "ghost"] }), { today });
    expect(problems).toEqual([
      'knowledge/emergencies.json [blackout] field "items": unknown item "ghost"',
    ]);
  });

  it("rejects an item triggered by another scenario", () => {
    const problems = checkRules(
      withScenario({}, [item(), candle({ when: { emergency: "flood" } })]),
      { today },
    );
    expect(problems.join("\n")).toContain('triggered by emergency "flood", not this one');
  });

  it("rejects an orphaned emergency item", () => {
    const problems = checkRules(withScenario({ items: [] }), { today });
    expect(problems).toEqual([
      'knowledge/items.json [candle]: triggered by emergency "blackout" but that scenario does not list it',
    ]);
  });

  it("rejects an emergency trigger with no scenario", () => {
    const problems = checkRules(kb({ items: [candle()], emergencies: [] }), { today });
    expect(problems.join("\n")).toContain('unknown emergency "blackout"');
  });

  it("rejects a scenario that lists a baseline item", () => {
    const problems = checkRules(withScenario({ items: ["candle", "water"] }), { today });
    expect(problems).toEqual([
      'knowledge/emergencies.json [blackout] field "items": item "water" is a baseline item (no emergency trigger)',
    ]);
  });

  it("applies the evidence rules to a scenario", () => {
    const draft = { sourceId: "guide", quote: "x" };
    expect(checkRules(withScenario({ evidence: draft }), { today })).toEqual([]);
    expect(
      checkRules(withScenario({ evidence: { ...draft, sourceId: "nope" } }), { today }).join("\n"),
    ).toContain('[blackout] field "evidence.sourceId": unknown source "nope"');
    expect(
      checkRules(withScenario({ evidence: { ...evidence, sourceId: "blog" } }), { today }).join(
        "\n",
      ),
    ).toContain('[blackout]: intendedSource is "official"');
    expect(
      checkRules(withScenario({ evidence: { ...evidence, verifiedAt: "2027-01-01" } }), {
        today,
      }).join("\n"),
    ).toContain("must not be in the future");
  });

  it("rejects a scenario listing a slug twice (schema)", () => {
    const dir = temp();
    writeKnowledge(dir, withScenario({ items: ["candle", "candle"] }));
    expect(() => loadKnowledge(join(dir, "knowledge"))).toThrow(
      /emergencies\.json #0 \[blackout\] field "items"/,
    );
  });
});

describe("generate", () => {
  it("marks only complete owner-verified official evidence as verified", () => {
    const out = generate(kb({ items: [item({ evidence }), item({ id: "draft" })] }));
    const ts = out["src/lib/plan/content.generated.ts"];
    expect(ts).toContain('"verified":true');
    expect(ts).toContain('"sourceId":"guide"');
    expect(ts).not.toContain("quote");
    expect(ts).not.toContain("Woda");
    const messages = JSON.parse(out["messages/pl.knowledge.json"]);
    expect(messages.plan.items.water).toEqual({ name: "Woda", listName: "Woda" });
    expect(messages.plan.emergencies).toEqual({});
    expect(messages.plan.sourceRegister.guide).toEqual({ title: "T", publisher: "P" });
  });
});

describe("generate: scenarios", () => {
  it("emits scenario copy to messages and ids, items and verified state to the TS", () => {
    const draft = generate(kb({ items: [item(), candle()], emergencies: [scenario()] }));
    const ts = draft["src/lib/plan/content.generated.ts"];
    expect(ts).toContain(
      'export const EMERGENCIES = [{"id":"blackout","items":["candle"],"intendedSource":"official","verified":false}]',
    );
    expect(ts).toContain('export type EmergencyId = (typeof EMERGENCIES)[number]["id"]');
    expect(ts).not.toContain("Opis");
    const messages = JSON.parse(draft["messages/pl.knowledge.json"]);
    expect(messages.plan.emergencies.blackout).toEqual({ name: "Brak prądu", explanation: "Opis" });

    const verified = generate(
      kb({ items: [item(), candle()], emergencies: [scenario({ evidence })] }),
    );
    expect(verified["src/lib/plan/content.generated.ts"]).toContain(
      '"verified":true,"sourceId":"guide"',
    );
  });
});

const roots = [];
function temp() {
  const dir = mkdtempSync(join(tmpdir(), "knowledge-"));
  roots.push(dir);
  return dir;
}
function writeKnowledge(dir, data) {
  mkdirSync(join(dir, "knowledge"), { recursive: true });
  for (const name of ["sources", "items", "emergencies"]) {
    writeFileSync(join(dir, "knowledge", `${name}.json`), JSON.stringify(data[name]));
  }
}
afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("run", () => {
  it("writes, then --check passes, then reports a stale file", async () => {
    const dir = temp();
    writeKnowledge(dir, kb({ items: [item()] }));
    expect(await run({ rootDir: dir, check: true })).toMatchObject({ ok: false });
    expect(await run({ rootDir: dir })).toEqual({ ok: true, problems: [] });
    expect(await run({ rootDir: dir, check: true })).toEqual({ ok: true, problems: [] });
    const ts = join(dir, "src/lib/plan/content.generated.ts");
    writeFileSync(ts, `${readFileSync(ts, "utf8")}// hand edit\n`);
    const result = await run({ rootDir: dir, check: true });
    expect(result.ok).toBe(false);
    expect(result.problems).toEqual([
      "src/lib/plan/content.generated.ts is stale; run `npm run knowledge`",
    ]);
  });

  it("reports rule failures without writing", async () => {
    const dir = temp();
    writeKnowledge(dir, kb({ items: [item(), item()] }));
    const result = await run({ rootDir: dir });
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain("duplicate id");
  });

  it("reports schema failures naming file, slug and field", async () => {
    const dir = temp();
    writeKnowledge(dir, kb({ items: [item({ id: "Bad_Slug" })] }));
    const result = await run({ rootDir: dir });
    expect(result.problems).toEqual([
      'knowledge/items.json #0 [Bad_Slug] field "id": must be kebab-case',
    ]);
  });
});
