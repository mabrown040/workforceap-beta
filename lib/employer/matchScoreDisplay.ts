/**
 * Normalize match score to a display percent 0–100.
 * Values in [0, 1) are 0–1 fractions; values ≥ 1 are integer percents (Prisma `AIJobMatch.matchScore`).
 * Using `< 1` (not `<= 1`) avoids treating integer 1 (1%) like float 1.0 (100%).
 */
export function matchScoreAsPercent(score: number): number {
  if (score >= 0 && score < 1) return Math.round(score * 100);
  return Math.min(100, Math.round(score));
}
