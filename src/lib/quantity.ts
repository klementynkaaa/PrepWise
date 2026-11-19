/**
 * Recommended quantity = per-person-per-day amount x people x days.
 * Throws RangeError for negative or non-finite inputs.
 */
export function recommendedQuantity(perPersonPerDay: number, people: number, days: number): number {
  for (const value of [perPersonPerDay, people, days]) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError("Quantity inputs must be finite, non-negative numbers.");
    }
  }
  return perPersonPerDay * people * days;
}

/** How close a value must be to a multiple of the step to count as that multiple. */
const SNAP = 1e-9;

/**
 * Rounds `value` up to a multiple of `step`. A value within 1e-9 of a multiple
 * snaps to it first, so float error never adds a step (0.2 × 3 with step 0.1
 * gives 0.6, not 0.7). Throws RangeError for a negative or non-finite value or
 * a step that is not positive.
 */
export function roundUpToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || value < 0 || !Number.isFinite(step) || step <= 0) {
    throw new RangeError("Rounding needs a finite, non-negative value and a positive step.");
  }
  const nearest = Math.round(value / step);
  const steps = Math.abs(value - nearest * step) < SNAP ? nearest : Math.ceil(value / step);
  // Multiplying back can bring float error again (3 × 0.1); trim it to the step's decimals.
  return Number((steps * step).toFixed(decimalsOf(step)));
}

function decimalsOf(step: number): number {
  const [, fraction = ""] = String(step).split(".");
  return fraction.length;
}
