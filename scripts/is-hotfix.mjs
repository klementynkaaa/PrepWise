// Prints "true" when REF is a hotfix/<kebab-case> branch, otherwise "false".
import { isHotfixHead } from "./lib/pr-rules.mjs";

console.log(isHotfixHead(process.env.REF) ? "true" : "false");
