// Turns the tested static export in out/ into .vercel/output (Build Output API
// v3), so `vercel deploy --prebuilt` ships exactly what the browser tests saw.
import { cpSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { toBuildOutputConfig } from "./lib/vercel-output.mjs";

const OUT_DIR = "out";
const OUTPUT_DIR = ".vercel/output";
const STATIC_DIR = `${OUTPUT_DIR}/static`;

function listHtml(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listHtml(full);
    return entry.name.endsWith(".html") ? [relative(OUT_DIR, full).split("\\").join("/")] : [];
  });
}

const vercelJson = JSON.parse(readFileSync("vercel.json", "utf8"));

rmSync(OUTPUT_DIR, { recursive: true, force: true });
mkdirSync(STATIC_DIR, { recursive: true });
cpSync(OUT_DIR, STATIC_DIR, { recursive: true });

const config = toBuildOutputConfig(vercelJson, listHtml(OUT_DIR));
writeFileSync(`${OUTPUT_DIR}/config.json`, `${JSON.stringify(config, null, 2)}\n`);

console.log(`[vercel-output] ${OUTPUT_DIR}: static copy of ${OUT_DIR}/ + config.json`);
