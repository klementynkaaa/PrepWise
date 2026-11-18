import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// All user-facing Polish lives in messages/pl.json. This guard scans app
// source for Polish diacritic letters in string literals, template text and
// JSX text (comments are ignored) and fails on a hit.
//
// Limit: Polish words without diacritics ("wode", "tak") are not caught, so
// review still applies.

const root = process.cwd();
const scanned = ["src/app", "src/components", "src/features", "src/lib/plan"];
const diacritics = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
const skipFile = /\.(stories|test|int\.test)\.tsx?$/;

function sourceFiles(dir: string): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !skipFile.test(entry.name) ? [path] : [];
  });
}

function polishTextInCode(file: string, code: string): string[] {
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
    ) {
      if (diacritics.test(node.text)) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart());
        hits.push(`${relative(root, file)}:${line + 1} ${JSON.stringify(node.text.trim())}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return hits;
}

const polishTextIn = (file: string) => polishTextInCode(file, readFileSync(file, "utf8"));

describe("no hard-coded Polish", () => {
  it("finds source files to scan in every scanned folder", () => {
    for (const dir of scanned) {
      expect(sourceFiles(join(root, dir)).length, dir).toBeGreaterThan(0);
    }
  });

  it("keeps Polish text out of src/app, src/components, src/features and src/lib/plan", () => {
    const hits = scanned.flatMap((dir) => sourceFiles(join(root, dir))).flatMap(polishTextIn);
    expect(hits, `Move this text to messages/pl.json:\n${hits.join("\n")}`).toEqual([]);
  });

  it("flags Polish letters in strings and JSX text, not in comments", () => {
    const code = [
      "// zażółć gęślą jaźń",
      "/* zażółć */",
      'const a = "gęślą";',
      "const b = <p>jaźń</p>;",
      "const c = `zażółć ${a}`;",
      'const d = "plain";',
    ].join("\n");
    expect(polishTextInCode("x.tsx", code)).toHaveLength(3);
  });
});
