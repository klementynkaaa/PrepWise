// Pure transform: vercel.json (cleanUrls + headers) -> Build Output API v3
// config.json (https://vercel.com/docs/build-output-api/configuration).

// vercel.json header sources are path patterns. Only literal paths and
// `(.*)` wildcards are used here; anything else is rejected rather than guessed.
function sourceToRegex(source) {
  if (!source.startsWith("/")) throw new Error(`Header source must start with "/": ${source}`);
  if (/[:*?+[\]{}|\\^$]/.test(source.replaceAll("(.*)", ""))) {
    throw new Error(`Unsupported header source pattern: ${source}`);
  }
  const escaped = source
    .split("(.*)")
    .map((part) => part.replace(/[.()]/g, "\\$&"))
    .join("(.*)");
  return `^${escaped}$`;
}

// Static .html files that cleanUrls serves without the extension.
// `htmlFiles` are paths relative to the static root, e.g. "offline.html".
export function cleanUrlOverrides(htmlFiles) {
  const overrides = {};
  for (const file of htmlFiles) {
    if (!file.endsWith(".html")) continue;
    const withoutExt = file.slice(0, -".html".length);
    if (withoutExt === "index") continue; // served at "/" already
    if (file === "404.html") continue; // kept at its path for the error handler
    const path = withoutExt.endsWith("/index") ? withoutExt.slice(0, -"/index".length) : withoutExt;
    overrides[file] = { path };
  }
  return overrides;
}

export function toBuildOutputConfig(vercelJson, htmlFiles = []) {
  const routes = [];
  const config = { version: 3, routes };

  if (vercelJson.cleanUrls) {
    // Same redirects Vercel's cleanUrls applies: /x.html -> /x, /x/index -> /x.
    routes.push(
      {
        src: "^/(?:(.*)/)?index(?:\\.html)?/?$",
        status: 308,
        headers: { Location: "/$1" },
      },
      { src: "^/(.*)\\.html/?$", status: 308, headers: { Location: "/$1" } },
    );
    config.overrides = cleanUrlOverrides(htmlFiles);
  }

  for (const rule of vercelJson.headers ?? []) {
    routes.push({
      src: sourceToRegex(rule.source),
      headers: Object.fromEntries(rule.headers.map((h) => [h.key, h.value])),
      continue: true,
    });
  }

  routes.push({ handle: "filesystem" });
  if (htmlFiles.includes("404.html")) {
    routes.push({ handle: "error" }, { status: 404, src: "^(?!/api).*$", dest: "/404.html" });
  }
  return config;
}
