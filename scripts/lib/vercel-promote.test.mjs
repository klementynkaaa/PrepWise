import { describe, expect, it } from "vitest";
import { deploymentHost, lookupUrl, promoteUrl, servesSha } from "./vercel-promote.mjs";

describe("deploymentHost", () => {
  it("accepts a URL, a trailing slash and a bare hostname", () => {
    expect(deploymentHost("https://prepwise-abc12-garden-mind.vercel.app")).toBe(
      "prepwise-abc12-garden-mind.vercel.app",
    );
    expect(deploymentHost("https://prepwise-abc12-garden-mind.vercel.app/")).toBe(
      "prepwise-abc12-garden-mind.vercel.app",
    );
    expect(deploymentHost("prepwise-abc12-garden-mind.vercel.app")).toBe(
      "prepwise-abc12-garden-mind.vercel.app",
    );
  });

  it("rejects empty or malformed values", () => {
    expect(() => deploymentHost("")).toThrow();
    expect(() => deploymentHost(undefined)).toThrow();
    expect(() => deploymentHost("not a url")).toThrow();
    expect(() => deploymentHost("https://")).toThrow();
  });
});

describe("API urls", () => {
  it("builds the lookup and promote URLs with the team id", () => {
    expect(lookupUrl("a.vercel.app", "team_1")).toBe(
      "https://api.vercel.com/v13/deployments/a.vercel.app?teamId=team_1",
    );
    expect(promoteUrl("prj_1", "dpl_2", "team_1")).toBe(
      "https://api.vercel.com/v10/projects/prj_1/promote/dpl_2?teamId=team_1",
    );
  });

  it("escapes path and query values", () => {
    expect(promoteUrl("a/b", "c d", "t&x")).toBe(
      "https://api.vercel.com/v10/projects/a%2Fb/promote/c%20d?teamId=t%26x",
    );
  });
});

describe("servesSha", () => {
  it("is true only for the exact commit", () => {
    expect(servesSha({ sha: "abc" }, "abc")).toBe(true);
    expect(servesSha({ sha: "abd" }, "abc")).toBe(false);
    expect(servesSha({}, "abc")).toBe(false);
    expect(servesSha(null, "abc")).toBe(false);
  });
});
