/**
 * Convert seconds to whole minutes using a ≥31s round-up threshold:
 *   remainder < 31s  → floor  (e.g. 90s → 1m, 150s → 2m)
 *   remainder ≥ 31s  → ceil   (e.g. 91s → 2m, 151s → 3m)
 *
 * Equivalent to Math.floor((s + 29) / 60).
 */
export function secsToMins(s: number): number {
  return Math.floor((s + 29) / 60);
}

/**
 * Format a duration in seconds as a human-readable string ("Xh Ym" or "Xm"),
 * applying the same ≥31s round-up rule for the minutes component.
 * Handles minute carry (e.g. 1h 59m 31s → "2h").
 */
export function fmtSecs(s: number): string {
  if (s <= 0) return "0m";
  const totalMins = secsToMins(s);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
