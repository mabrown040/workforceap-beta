/**
 * Normalize stored match score to a display percent 0–100.
 *
 * API contract:
 * - score <= 1.0  → treat as a 0–1 float (multiply by 100). e.g. 0.75 → 75, 1.0 → 100.
 * - score > 1.0   → treat as already in 0–100 range. e.g. 75 → 75, 75.0 → 75.
 *
 * Note: JavaScript has no runtime integer/float distinction (Number.isInteger(75.0) === true),
 * so we use the value boundary rather than trying to detect the type.
 */
export function matchScoreAsPercent(score: number): number {
  if (!Number.isFinite(score) || score < 0) return 0;
  if (score <= 1.0) {
    return Math.min(100, Math.round(score * 100));
  }
  return Math.min(100, Math.round(score));
}
