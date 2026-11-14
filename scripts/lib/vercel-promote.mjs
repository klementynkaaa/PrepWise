// Pure helpers for scripts/vercel-promote.mjs. The CLI's `vercel promote` loads the
// token's user first, which fails for this token, so promotion goes through the
// REST API: https://vercel.com/docs/rest-api (promote a deployment).

const API = "https://api.vercel.com";

// "https://prepwise-abc-team.vercel.app/" or "prepwise-abc-team.vercel.app" -> hostname.
export function deploymentHost(value) {
  const host = String(value ?? "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host)) {
    throw new Error("STAGING_URL is not a deployment URL");
  }
  return host;
}

export function lookupUrl(host, teamId) {
  return `${API}/v13/deployments/${encodeURIComponent(host)}?teamId=${encodeURIComponent(teamId)}`;
}

export function promoteUrl(projectId, deploymentId, teamId) {
  return (
    `${API}/v10/projects/${encodeURIComponent(projectId)}` +
    `/promote/${encodeURIComponent(deploymentId)}?teamId=${encodeURIComponent(teamId)}`
  );
}

// True once the production domain serves the build for `sha`.
export function servesSha(versionJson, sha) {
  return Boolean(versionJson) && typeof versionJson.sha === "string" && versionJson.sha === sha;
}
