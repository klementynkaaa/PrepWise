// Prints the next free release tag (vYYYY.MM.DD[.N]) for today in Warsaw,
// based on the tags that exist on the remote.
import { execFileSync } from "node:child_process";
import { nextReleaseTag } from "./lib/release-tag.mjs";

const output = execFileSync("git", ["ls-remote", "--tags", "--refs", "origin"], {
  encoding: "utf8",
});
const existing = output
  .split("\n")
  .map((line) => line.split("\trefs/tags/")[1])
  .filter(Boolean);

console.log(nextReleaseTag(new Date(), existing));
