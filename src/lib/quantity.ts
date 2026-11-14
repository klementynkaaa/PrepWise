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
