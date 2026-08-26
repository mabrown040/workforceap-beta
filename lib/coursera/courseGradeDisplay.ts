/**
 * Normalizes Coursera course grades for UI.
 *
 * `course_progress.score_scaled` follows xAPI `result.score.scaled`: typically 0–1
 * (e.g. 0.7733). Some sources store 0–100 instead; CSV grades are usually human
 * percents ("77.33%").
 */

/** Convert stored score_scaled to a 0–100 display value (two decimal places when needed). */
export function scoreScaledToDisplayPercent(scoreScaled: number | null | undefined): number | null {
  if (scoreScaled == null || !Number.isFinite(scoreScaled)) return null;
  const s = scoreScaled;
  let pct: number;
  if (s >= 0 && s <= 1) pct = s * 100;
  else if (s > 1 && s <= 100) pct = s;
  else if (s > 100) pct = 100;
  else return null;
  const rounded = Math.round(pct * 100) / 100;
  return rounded;
}

/** Format a 0–100 grade for display (`87` or `87.25`). */
export function formatGradePercent(pct: number | null | undefined): string | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  const rounded = Math.round(pct * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/** Parse CSV / human-readable grade cells; returns 0–100 or null. */
export function parseCourseGradeString(courseGrade: string | null | undefined): number | null {
  if (courseGrade == null || typeof courseGrade !== 'string') return null;
  const t = courseGrade.trim();
  if (!t) return null;
  if (/^pass$/i.test(t)) return null;
  const cleaned = t.replace(/,/g, '').replace(/%/g, '').trim();
  const num = parseFloat(cleaned);
  if (!Number.isFinite(num)) return null;
  if (num >= 0 && num <= 1) return Math.round(num * 10000) / 100;
  if (num > 1 && num <= 100) return Math.round(num * 100) / 100;
  if (num > 100) return 100;
  return null;
}

/**
 * Best-effort extraction of a course-level grade from a Coursera B4B gradebook row.
 * Returns a 0–1 value suitable for `course_progress.score_scaled`, or null if unknown.
 */
export function extractGradebookCourseScoreScaled(row: unknown): number | null {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const raw = row as Record<string, unknown>;

  const tryNumber = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;

  const keys = [
    'gradingOverallWeightedPercent',
    'overallWeightedPercent',
    'courseGradePercent',
    'currentGradePercent',
    'gradingOverallPercent',
    'overallGradePercent',
    'normalizedGrade',
    'gradePercent',
    'grade',
  ];

  for (const k of keys) {
    const v = tryNumber(raw[k]);
    if (v != null) return percentOrScaledToScoreScaled(v);
  }

  const gradingOverall = raw.gradingOverall;
  if (gradingOverall && typeof gradingOverall === 'object' && !Array.isArray(gradingOverall)) {
    const inner = tryNumber((gradingOverall as Record<string, unknown>).percent);
    if (inner != null) return percentOrScaledToScoreScaled(inner);
  }

  const items = raw.items;
  if (Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const ir = item as Record<string, unknown>;
      if (ir.isOverall === true || ir.overall === true || ir.type === 'OVERALL') {
        const v =
          tryNumber(ir.percent) ??
          tryNumber(ir.scorePercent) ??
          tryNumber(ir.normalizedScore);
        if (v != null) return percentOrScaledToScoreScaled(v);
      }
    }
  }

  return null;
}

function percentOrScaledToScoreScaled(v: number): number {
  if (v > 1 && v <= 100) return Math.min(1, Math.max(0, v / 100));
  if (v >= 0 && v <= 1) return Math.min(1, Math.max(0, v));
  if (v > 100) return 1;
  return 0;
}
