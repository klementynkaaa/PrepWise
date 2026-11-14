// Builds the service worker after `next build` has written the static export
// to `out/`. Every exported page, RSC payload and asset is added to the
// precache manifest, then src/sw.ts is bundled to out/sw.js with esbuild.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { getFileManifestEntries } from "@serwist/build";
import { build } from "esbuild";

const OUT_DIR = "out";

// out/version.json records the commit this build came from, so a health check
// can prove which version a URL serves. It stays out of the precache so the
// check always reads it from the network.
function currentSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

writeFileSync(
  `${OUT_DIR}/version.json`,
  `${JSON.stringify({ sha: currentSha(), builtAt: new Date().toISOString() })}\n`,
);

const { manifestEntries, count, size, warnings } = await getFileManifestEntries({
  globDirectory: OUT_DIR,
  globPatterns: ["**/*.{html,txt,js,css,json,webmanifest,svg,png,ico,woff,woff2}"],
  globIgnores: ["sw.js", "sw.js.map", "version.json"],
  // Next.js hashes file names under _next/static, so they need no revision.
  dontCacheBustURLsMatching: /^_next\/static\//,
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
});

for (const warning of warnings) console.warn(`[sw] ${warning}`);

await build({
  entryPoints: ["src/sw.ts"],
  outfile: `${OUT_DIR}/sw.js`,
  bundle: true,
  format: "iife",
  minify: true,
  sourcemap: true,
  target: "es2020",
  define: {
    "self.__SW_MANIFEST": JSON.stringify(manifestEntries ?? []),
    "process.env.NODE_ENV": '"production"',
  },
});

console.log(`[sw] ${OUT_DIR}/sw.js: ${count} precache entries (${(size / 1024).toFixed(1)} KiB)`);
