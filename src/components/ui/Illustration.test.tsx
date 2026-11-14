import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { illustrationNames } from "./Illustration";

describe("Illustration files", () => {
  it("has an SVG in public/illustrations for every name, and no SVG without a name", () => {
    const files = readdirSync(join(process.cwd(), "public/illustrations"))
      .filter((file) => file.endsWith(".svg"))
      .map((file) => file.replace(/\.svg$/, ""));
    expect([...files].sort()).toEqual([...illustrationNames].sort());
  });
});
