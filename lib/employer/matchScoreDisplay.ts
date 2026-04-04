/** Normalize stored match score (0–1 float or 0–100 int) to a display percent 0–100. */
export function matchScoreAsPercent(score: number): number {
  if (score <= 1 && score >= 0) return Math.round(score * 100);
  return Math.min(100, Math.round(score));
}
