import { describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  partner: { findUnique: vi.fn().mockResolvedValue({ name: 'Synthetic partner', slug: 'synthetic-partner' }) },
  partnerReferral: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  placementRecord: { groupBy: vi.fn() },
}));
vi.mock('@/lib/db/prisma', () => ({ prisma: dbMocks }));

import { generatePartnerQuarterlyOutcomes } from '@/lib/analytics/partnerQuarterlyOutcomes';

describe('partner quarterly retention evidence', () => {
  it('uses the requested window and keeps unproven 180-day outcomes visible', async () => {
    dbMocks.placementRecord.groupBy.mockResolvedValue([
      { retentionStatus: 'retained_90d', retentionDecision: null, _count: { _all: 2 } },
      { retentionStatus: null, retentionDecision: 'retained', _count: { _all: 1 } },
      { retentionStatus: 'retained_180d', retentionDecision: null, _count: { _all: 1 } },
      { retentionStatus: 'separated', retentionDecision: null, _count: { _all: 1 } },
    ]);
    const report = await generatePartnerQuarterlyOutcomes('org-fixture', 'partner-fixture', { quarter: 'Q1', year: 2026 });
    expect(report.retention.ninetyDay).toEqual({ retained: 4, notRetainedOrSeparated: 1, pendingDecision: 0, total: 5 });
    expect(report.retention.hundredEightyDay).toEqual({ retained: 1, notRetainedOrSeparated: 1, pendingDecision: 3, total: 5 });
  });
});
