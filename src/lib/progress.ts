/**
 * Progress arithmetic for rings, bars and counts. Display helpers never
 * throw: invalid input is clamped, so a bad count can't break a screen. The
 * words ("Gotowe 3 z 7") live in messages/pl.json (`progress.*`); callers
 * format them from `clampProgress`, so the numbers match the bar.
 */

/**
 * Whole, non-negative counts with done never above total. Non-finite input
 * counts as 0.
 */
export function clampProgress(done: number, total: number): { done: number; total: number } {
  const t = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const d = Number.isFinite(done) ? Math.min(Math.max(0, Math.floor(done)), t) : 0;
  return { done: d, total: t };
}

/**
 * Whole percentage 0–100. Rounds down, so 100 % appears only when every item
 * is done (199 of 200 is 99 %, not 100 %). An empty total is 0 %.
 */
export function progressPercent(done: number, total: number): number {
  const { done: d, total: t } = clampProgress(done, total);
  return t === 0 ? 0 : Math.floor((d / t) * 100);
}
