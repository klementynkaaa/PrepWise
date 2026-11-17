import { describe, expect, it } from "vitest";
import { advisories, evaluateAudit, parseExceptions } from "./audit-gate.mjs";

const PICO = "GHSA-fc5q-39xc-vjpf";
const OTHER = "GHSA-aaaa-bbbb-cccc";

function advisory(id, name, severity) {
  return {
    source: 1,
    name,
    severity,
    title: `${name} issue`,
    url: `https://github.com/advisories/${id}`,
  };
}

// The shape of `npm audit --json` (v2): advisories appear as objects in `via`,
// packages that only depend on a vulnerable package list its name as a string.
const report = {
  vulnerabilities: {
    picomatch: { severity: "high", via: [advisory(PICO, "picomatch", "high")] },
    micromatch: { severity: "high", via: ["picomatch"] },
    vite: { severity: "high", via: [advisory(PICO, "picomatch", "high"), "picomatch"] },
    glob: { severity: "moderate", via: [advisory(OTHER, "glob", "moderate")] },
  },
};

const exception = { id: PICO, reason: "dev tools only, never user input", reviewBy: "2026-12-17" };

describe("advisories", () => {
  it("lists each advisory once and ignores package chains", () => {
    expect(advisories(report).map((a) => a.id)).toEqual([PICO, OTHER]);
  });

  it("handles an empty report", () => {
    expect(advisories({})).toEqual([]);
  });
});

describe("evaluateAudit", () => {
  it("blocks a high advisory with no exception", () => {
    const result = evaluateAudit(report, [], "2026-11-17");
    expect(result.blocking.map((a) => a.id)).toEqual([PICO]);
  });

  it("ignores moderate advisories", () => {
    const result = evaluateAudit(report, [exception], "2026-11-17");
    expect(result.blocking).toEqual([]);
    expect(result.excepted.map((a) => a.id)).toEqual([PICO]);
  });

  it("lets an excepted advisory through up to and including its reviewBy date", () => {
    expect(evaluateAudit(report, [exception], "2026-12-17").blocking).toEqual([]);
  });

  it("blocks again once the reviewBy date has passed", () => {
    const result = evaluateAudit(report, [exception], "2026-12-18");
    expect(result.blocking.map((a) => a.id)).toEqual([PICO]);
    expect(result.expired.map((a) => a.id)).toEqual([PICO]);
  });

  it("blocks a critical advisory that has no exception even when others are excepted", () => {
    const withCritical = {
      vulnerabilities: {
        ...report.vulnerabilities,
        next: {
          severity: "critical",
          via: [advisory(OTHER.replace("cccc", "dddd"), "next", "critical")],
        },
      },
    };
    const result = evaluateAudit(withCritical, [exception], "2026-11-17");
    expect(result.blocking.map((a) => a.name)).toEqual(["next"]);
  });

  it("reports exceptions that no longer match anything", () => {
    const result = evaluateAudit({ vulnerabilities: {} }, [exception], "2026-11-17");
    expect(result.unused).toEqual([exception]);
    expect(result.blocking).toEqual([]);
  });
});

describe("parseExceptions", () => {
  it("accepts a valid file", () => {
    expect(parseExceptions({ exceptions: [exception] })).toEqual([exception]);
  });

  it("rejects a missing list", () => {
    expect(() => parseExceptions({})).toThrow(/must be an array/);
  });

  it("rejects an id that is not a GHSA id", () => {
    expect(() => parseExceptions({ exceptions: [{ ...exception, id: "CVE-2026-1" }] })).toThrow(
      /GHSA id/,
    );
  });

  it("rejects a missing or too short reason", () => {
    expect(() => parseExceptions({ exceptions: [{ ...exception, reason: "ok" }] })).toThrow(
      /reason/,
    );
  });

  it("rejects an entry without a reviewBy date", () => {
    expect(() => parseExceptions({ exceptions: [{ id: PICO, reason: exception.reason }] })).toThrow(
      /reviewBy/,
    );
  });
});
