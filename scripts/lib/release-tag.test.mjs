import { describe, expect, it } from "vitest";
import { nextReleaseTag, warsawDay } from "./release-tag.mjs";

describe("warsawDay", () => {
  it("uses the Warsaw calendar day, not UTC", () => {
    // 23:30 UTC on 31 Dec is already 1 Jan in Warsaw (UTC+1).
    expect(warsawDay(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
    // 22:30 UTC in summer (UTC+2) is already the next day.
    expect(warsawDay(new Date("2026-06-15T22:30:00Z"))).toBe("2026-06-16");
    // 22:30 UTC in winter (UTC+1) is still the same day.
    expect(warsawDay(new Date("2026-11-14T22:30:00Z"))).toBe("2026-11-14");
  });
});

describe("nextReleaseTag", () => {
  const date = new Date("2026-11-14T10:00:00Z");

  it("uses the plain date for the first release of a day", () => {
    expect(nextReleaseTag(date, [])).toBe("v2026.11.14");
    expect(nextReleaseTag(date)).toBe("v2026.11.14");
  });

  it("appends .2 and .3 for later releases the same day", () => {
    expect(nextReleaseTag(date, ["v2026.11.14"])).toBe("v2026.11.14.2");
    expect(nextReleaseTag(date, ["v2026.11.14", "v2026.11.14.2"])).toBe("v2026.11.14.3");
  });

  it("takes the first free number", () => {
    expect(nextReleaseTag(date, ["v2026.11.14", "v2026.11.14.3"])).toBe("v2026.11.14.2");
  });

  it("ignores unrelated tags and other days", () => {
    expect(
      nextReleaseTag(date, ["v1.0.0", "latest", "v2026.11.13", "v2026.11.140", "x2026.11.14"]),
    ).toBe("v2026.11.14");
  });

  it("handles month and year boundaries in Warsaw time", () => {
    expect(nextReleaseTag(new Date("2026-12-31T23:30:00Z"), [])).toBe("v2027.01.01");
    expect(nextReleaseTag(new Date("2026-01-31T23:30:00Z"), [])).toBe("v2026.02.01");
    expect(nextReleaseTag(new Date("2026-12-31T22:59:00Z"), [])).toBe("v2026.12.31");
  });

  it("zero-pads month and day", () => {
    expect(nextReleaseTag(new Date("2026-03-05T12:00:00Z"), [])).toBe("v2026.03.05");
  });
});
