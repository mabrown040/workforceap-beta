import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockUserFindMany = vi.fn();

vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: async (_orgId: string, fn: (db: unknown) => Promise<unknown>) =>
    fn({ user: { findMany: mockUserFindMany } }),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

import { getFunderProgramSummaryRows } from './funderProgramMetrics';

function mockUser(opts: { id: string; hasPlacement: boolean; startDateVerified?: boolean }) {
  return {
    id: opts.id,
    enrolledProgram: 'cna',
    courseEnrollments: [],
    memberProgramProgress: [],
    placementRecord: opts.hasPlacement
      ? { id: `placement-${opts.id}`, startDateVerified: opts.startDateVerified ?? false }
      : null,
  };
}

describe('getFunderProgramSummaryRows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('only counts staff-verified placements toward the funder-reported "placed" total', async () => {
    mockUserFindMany.mockResolvedValue([
      mockUser({ id: 'u1', hasPlacement: true, startDateVerified: true }),
      mockUser({ id: 'u2', hasPlacement: true, startDateVerified: false }),
      mockUser({ id: 'u3', hasPlacement: false }),
    ]);

    const { rows } = await getFunderProgramSummaryRows('org-1');

    const cnaRow = rows.find((r) => r.programSlug === 'cna');
    expect(cnaRow?.totalEnrolled).toBe(3);
    // Only u1's verified placement counts — u2's unverified auto-created
    // record must not inflate the funder-facing placement total.
    expect(cnaRow?.placed).toBe(1);
    expect(cnaRow?.placementPct).toBe(33);
  });
});
