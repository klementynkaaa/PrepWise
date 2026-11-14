// Promotes the staged production deployment to the production domain, then waits until
// the domain serves the expected commit. Nothing is rebuilt.
// Env: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, STAGING_URL, EXPECTED_SHA, PRODUCTION_URL.
// Secrets are never printed.
import { deploymentHost, lookupUrl, promoteUrl, servesSha } from "./lib/vercel-promote.mjs";

const need = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

const token = need("VERCEL_TOKEN");
const teamId = need("VERCEL_ORG_ID");
const projectId = need("VERCEL_PROJECT_ID");
const host = deploymentHost(need("STAGING_URL"));
const sha = need("EXPECTED_SHA");
const productionUrl = need("PRODUCTION_URL").replace(/\/$/, "");
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

const headers = { Authorization: `Bearer ${token}` };

async function call(method, url) {
  const res = await fetch(url, { method, headers });
  if (!res.ok) {
    // Status and Vercel's error code only: never the request headers.
    let code = "";
    try {
      code = (await res.json())?.error?.code ?? "";
    } catch {}
    throw new Error(
      `${method} ${new URL(url).pathname.split("/").slice(0, 4).join("/")} -> ${res.status} ${code}`.trim(),
    );
  }
  return res;
}

const deployment = await (await call("GET", lookupUrl(host, teamId))).json();
if (typeof deployment.id !== "string") throw new Error("Deployment lookup returned no id");
console.log(`Promoting ${deployment.id} (target: ${deployment.target ?? "none"})`);

await call("POST", promoteUrl(projectId, deployment.id, teamId));
console.log("Promotion requested; waiting for the production domain to serve the commit.");

const versionHeaders = bypass
  ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" }
  : {};
for (let attempt = 1; attempt <= 24; attempt++) {
  try {
    const res = await fetch(`${productionUrl}/version.json`, {
      headers: versionHeaders,
      cache: "no-store",
    });
    if (res.ok && servesSha(await res.json(), sha)) {
      console.log(`Production serves ${sha.slice(0, 7)}.`);
      process.exit(0);
    }
  } catch {
    // The domain may not answer yet; retry.
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
throw new Error("Production domain did not serve the expected commit within 2 minutes");
