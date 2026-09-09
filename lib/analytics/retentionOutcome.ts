/**
 * Shared retention-outcome classification for PlacementRecord rows.
 *
 * A counselor's explicit not-retained decision supersedes an older retained
 * status. Otherwise preserve the existing 90-day classification:
 *   - retained:      retentionDecision === 'retained' OR retentionStatus startsWith 'retained'
 *   - not_retained:  retentionDecision === 'not_retained'  OR retentionStatus === 'separated'
 *   - pending:       anything else (null/unset, or an undecided placeholder like 'unknown'/'pending')
 *
 * A 180-day report requires the explicit retained_180d status. A 90-day status
 * or undated generic retained decision does not prove the longer window and
 * remains pending. Elapsed time alone is never evidence of continued work.
 */

export type RetentionOutcome = 'retained' | 'not_retained' | 'pending';

export type RetentionOutcomeRow = {
  retentionStatus?: string | null;
  retentionDecision?: string | null;
};

export function classifyRetentionOutcome(row: RetentionOutcomeRow, windowDays: 90 | 180 = 90): RetentionOutcome {
  if (row.retentionDecision === 'not_retained') return 'not_retained';

  const isRetained =
    row.retentionDecision === 'retained' || (row.retentionStatus?.startsWith('retained') ?? false);
  if (isRetained) {
    if (windowDays === 180 && row.retentionStatus !== 'retained_180d') return 'pending';
    return 'retained';
  }

  const isNotRetained = row.retentionStatus === 'separated';
  if (isNotRetained) return 'not_retained';

  return 'pending';
}

export type RetentionSummary = {
  retained: number;
  notRetainedOrSeparated: number;
  /** Undecided or insufficient evidence for this window; never dropped from the denominator. */
  pendingDecision: number;
  total: number;
};

export function summarizeRetentionOutcomes(rows: ReadonlyArray<RetentionOutcomeRow>, windowDays: 90 | 180 = 90): RetentionSummary {
  let retained = 0;
  let notRetained = 0;
  let pending = 0;
  for (const row of rows) {
    const outcome = classifyRetentionOutcome(row, windowDays);
    if (outcome === 'retained') retained += 1;
    else if (outcome === 'not_retained') notRetained += 1;
    else pending += 1;
  }
  return { retained, notRetainedOrSeparated: notRetained, pendingDecision: pending, total: rows.length };
}

/** Same classification as `summarizeRetentionOutcomes`, over `groupBy` buckets. */
export function summarizeRetentionGroups(
  groups: ReadonlyArray<RetentionOutcomeRow & { count: number }>,
  windowDays: 90 | 180 = 90,
): RetentionSummary {
  let retained = 0;
  let notRetained = 0;
  let pending = 0;
  let total = 0;
  for (const group of groups) {
    const n = Number.isFinite(group.count) && group.count > 0 ? Math.floor(group.count) : 0;
    total += n;
    const outcome = classifyRetentionOutcome(group, windowDays);
    if (outcome === 'retained') retained += n;
    else if (outcome === 'not_retained') notRetained += n;
    else pending += n;
  }
  return { retained, notRetainedOrSeparated: notRetained, pendingDecision: pending, total };
}
