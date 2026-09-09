import { describe, expect, it } from 'vitest';
import { classifyRetentionOutcome, summarizeRetentionGroups, summarizeRetentionOutcomes } from '@/lib/analytics/retentionOutcome';

describe('retention evidence for a reporting window', () => {
  it('keeps a 90-day confirmation pending in the 180-day report', () => {
    const row = { retentionStatus: 'retained_90d', retentionDecision: null };
    expect(classifyRetentionOutcome(row, 90)).toBe('retained');
    expect(classifyRetentionOutcome(row, 180)).toBe('pending');
  });

  it('accepts explicit 180-day confirmation for either window', () => {
    const row = { retentionStatus: 'retained_180d', retentionDecision: null };
    expect(classifyRetentionOutcome(row, 90)).toBe('retained');
    expect(classifyRetentionOutcome(row, 180)).toBe('retained');
  });

  it('does not infer 180 days from an undated retained decision or unknown retained label', () => {
    expect(classifyRetentionOutcome({ retentionDecision: 'retained' }, 90)).toBe('retained');
    expect(classifyRetentionOutcome({ retentionDecision: 'retained' }, 180)).toBe('pending');
    expect(classifyRetentionOutcome({ retentionStatus: 'retained_future' }, 180)).toBe('pending');
  });

  it.each([90, 180] as const)('honors a counselor loss decision over stale retained status at %s days', (days) => {
    expect(classifyRetentionOutcome({ retentionStatus: 'retained_180d', retentionDecision: 'not_retained' }, days)).toBe('not_retained');
    expect(classifyRetentionOutcome({ retentionStatus: 'separated' }, days)).toBe('not_retained');
  });

  it('keeps insufficient evidence in the denominator for rows and grouped reports', () => {
    const rows = [
      { retentionStatus: 'retained_90d' },
      { retentionStatus: 'retained_180d' },
      { retentionDecision: 'retained' },
      { retentionStatus: 'separated' },
      {},
    ];
    const expected = { retained: 1, notRetainedOrSeparated: 1, pendingDecision: 3, total: 5 };
    expect(summarizeRetentionOutcomes(rows, 180)).toEqual(expected);
    expect(summarizeRetentionGroups(rows.map((row) => ({ ...row, count: 1 })), 180)).toEqual(expected);
  });
});
