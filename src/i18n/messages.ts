import pl from "../../messages/pl.json";
import knowledge from "../../messages/pl.knowledge.json";

type Tree = { [key: string]: unknown };

const isTree = (value: unknown): value is Tree =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Deep-merges two message trees. A key present in both (other than a branch that
 * both sides share) throws, so the hand-owned and the generated files never
 * silently override each other.
 */
export function mergeMessages(a: Tree, b: Tree, path = ""): Tree {
  const merged: Tree = { ...a };
  for (const [key, value] of Object.entries(b)) {
    const here = path ? `${path}.${key}` : key;
    if (!Object.hasOwn(a, key)) {
      merged[key] = value;
    } else if (isTree(a[key]) && isTree(value)) {
      merged[key] = mergeMessages(a[key], value, here);
    } else {
      throw new Error(`Message key "${here}" is defined in both pl.json and pl.knowledge.json`);
    }
  }
  return merged;
}

export type Messages = typeof pl & typeof knowledge;

/** Every Polish message: the hand-owned `pl.json` plus the generated `pl.knowledge.json`. */
export const messages = mergeMessages(pl, knowledge) as Messages;
