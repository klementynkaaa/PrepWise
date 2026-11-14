import { describe, expect, it } from "vitest";
import { HTML_REDIRECT_SRC, cleanUrlOverrides, toBuildOutputConfig } from "./vercel-output.mjs";

const vercelJson = {
  cleanUrls: true,
  headers: [
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      ],
    },
    {
      source: "/manifest.webmanifest",
      headers: [{ key: "Content-Type", value: "application/manifest+json" }],
    },
  ],
};

describe("toBuildOutputConfig", () => {
  const config = toBuildOutputConfig(vercelJson, ["index.html", "offline.html"]);

  it("emits version 3 and ends the routes with the filesystem handler", () => {
    expect(config.version).toBe(3);
    expect(config.routes.at(-1)).toEqual({ handle: "filesystem" });
  });

  it("maps the sw.js headers as a continuing route", () => {
    const route = config.routes.find((r) => r.src === "^/sw\\.js$");
    expect(route).toEqual({
      src: "^/sw\\.js$",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Type": "application/javascript; charset=utf-8",
      },
      continue: true,
    });
  });

  it("maps the manifest content type", () => {
    const route = config.routes.find((r) => r.src === "^/manifest\\.webmanifest$");
    expect(route?.headers).toEqual({ "Content-Type": "application/manifest+json" });
  });

  it("serves /offline from offline.html and redirects the .html form", () => {
    expect(config.overrides).toEqual({ "offline.html": { path: "offline" } });
    const redirect = config.routes.find((r) => r.src === HTML_REDIRECT_SRC);
    expect(redirect).toMatchObject({ status: 308, headers: { Location: "/$1" } });
    expect(new RegExp(redirect.src).test("/offline.html")).toBe(true);
    expect(new RegExp(redirect.src).test("/offline")).toBe(false);
  });

  it("does not redirect /404.html, so the precached file answers 200", () => {
    const redirect = config.routes.find((r) => r.src === HTML_REDIRECT_SRC);
    expect(new RegExp(redirect.src).test("/404.html")).toBe(false);
    expect(new RegExp(redirect.src).test("/_not-found.html")).toBe(true);
  });

  it("keeps 404.html in place and routes errors to it", () => {
    const withError = toBuildOutputConfig(vercelJson, ["404.html", "offline.html"]);
    expect(withError.overrides).toEqual({ "offline.html": { path: "offline" } });
    expect(withError.routes.slice(-3)).toEqual([
      { handle: "filesystem" },
      { handle: "error" },
      { status: 404, src: "^(?!/api).*$", dest: "/404.html" },
    ]);
  });

  it("omits overrides and redirects without cleanUrls", () => {
    const plain = toBuildOutputConfig({ headers: [] }, ["offline.html"]);
    expect(plain.overrides).toBeUndefined();
    expect(plain.routes).toEqual([{ handle: "filesystem" }]);
  });

  it("rejects header sources it cannot translate", () => {
    expect(() => toBuildOutputConfig({ headers: [{ source: "/:path*", headers: [] }] })).toThrow(
      /Unsupported/,
    );
  });
});

describe("cleanUrlOverrides", () => {
  it("skips the root index and non-html files", () => {
    expect(cleanUrlOverrides(["index.html", "a.txt"])).toEqual({});
  });

  it("maps nested pages and nested index files", () => {
    expect(cleanUrlOverrides(["plan/index.html", "plan/step.html"])).toEqual({
      "plan/index.html": { path: "plan" },
      "plan/step.html": { path: "plan/step" },
    });
  });
});
