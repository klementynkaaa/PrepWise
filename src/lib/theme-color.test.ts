import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_COLOR } from "./theme-color";

describe("THEME_COLOR", () => {
  it("equals the --color-bg token in globals.css", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const token = /--color-bg:\s*(#[0-9a-f]{6})\s*;/i.exec(css)?.[1];
    expect(token).toBeDefined();
    expect(THEME_COLOR.toLowerCase()).toBe(token!.toLowerCase());
  });
});
