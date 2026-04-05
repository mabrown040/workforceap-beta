/**
 * Normalize stored match score to a display percent 0–100.
 * - DB (`AIJobMatch.match_score`) is an Int 0–100 (e.g. 35 → 35%).
 * - Some APIs still send 0–1 floats (e.g. 0.35 → 35%). Integers in 0–100 are never multiplied by 100.
 */
export function matchScoreAsPercent(score: number): number {
  if (!Number.isFinite(score) || score < 0) return 0;
  if (Number.isInteger(score) && score <= 100) {
    return score;
  }
  if (score > 1) {
    return Math.min(100, Math.round(score));
  }
  return Math.min(100, Math.round(score * 100));
}
