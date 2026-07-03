/**
 * Shared retention-outcome classification for PlacementRecord rows.
 *
 * Mirrors the OR-combination discipline established in
 * `lib/admin/boardOutcomes.ts` (real 90-day retention rate for the board
 * snapshot):
 *   - retained:      retentionDecision === 'retained'      OR retentionStatus startsWith 'retained' (retained_90d, retained_180d, ...)
 *   - not_retained:  retentionDecision === 'not_retained'  OR retentionStatus === 'separated'
 *   - pending:       anything else (null/unset, or an undecided placeholder like 'unknown'/'pending')
 *
 * Used by the funder-facing quarterly reports (lib/analytics/quarterlyOutcomes.ts,
 * lib/analytics/partnerQuarterlyOutcomes.ts) so the retention math stays
 * consistent with the board snapshot instead of drifting into a second,
 * subtly different definition.
 */

export type RetentionOutcome = 'retained' | 'not_retained' | 'pending';

export type RetentionOutcomeRow = {
  retentionStatus?: string | null;
  retentionDecision?: string | null;
};

export function classifyRetentionOutcome(row: RetentionOutcomeRow): RetentionOutcome {
  const isRetained =
    row.retentionDecision === 'retained' || (row.retentionStatus?.startsWith('retained') ?? false);
  if (isRetained) return 'retained';

  const isNotRetained = row.retentionDecision === 'not_retained' || row.retentionStatus === 'separated';
  if (isNotRetained) return 'not_retained';

  return 'pending';
}

export type RetentionSummary = {
  retained: number;
  notRetainedOrSeparated: number;
  /** Always reported — never silently dropped from the denominator. */
  pendingDecision: number;
  total: number;
};

export function summarizeRetentionOutcomes(rows: ReadonlyArray<RetentionOutcomeRow>): RetentionSummary {
  let retained = 0;
  let notRetained = 0;
  let pending = 0;
  for (const row of rows) {
    const outcome = classifyRetentionOutcome(row);
    if (outcome === 'retained') retained += 1;
    else if (outcome === 'not_retained') notRetained += 1;
    else pending += 1;
  }
  return { retained, notRetainedOrSeparated: notRetained, pendingDecision: pending, total: rows.length };
}
