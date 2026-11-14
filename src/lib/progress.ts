/**
 * Progress arithmetic and labels for rings and bars. Display helpers never
 * throw: invalid input is clamped, so a bad count can't break a screen.
 */

function sanitize(done: number, total: number): [number, number] {
  const t = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const d = Number.isFinite(done) ? Math.min(Math.max(0, Math.floor(done)), t) : 0;
  return [d, t];
}

/**
 * Whole percentage 0–100. Rounds down, so 100 % appears only when every item
 * is done (199 of 200 is 99 %, not 100 %). An empty total is 0 %.
 */
export function progressPercent(done: number, total: number): number {
  const [d, t] = sanitize(done, total);
  return t === 0 ? 0 : Math.floor((d / t) * 100);
}

/** Count in words, e.g. "12 z 38". */
export function progressCountLabel(done: number, total: number): string {
  const [d, t] = sanitize(done, total);
  return `${d} z ${t}`;
}

/** Short fraction for the inside of the progress ring, e.g. "12/38". */
export function progressFractionLabel(done: number, total: number): string {
  const [d, t] = sanitize(done, total);
  return `${d}/${t}`;
}

/** What a screen reader hears for a ring or bar, e.g. "Gotowe 12 z 38". */
export function progressAriaLabel(done: number, total: number): string {
  return `Gotowe ${progressCountLabel(done, total)}`;
}
