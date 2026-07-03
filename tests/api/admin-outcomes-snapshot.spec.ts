import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => {
  class MockNextResponse extends Response {
    static json(body: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      });
    }
  }

  return { NextResponse: MockNextResponse };
});

vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ isAdmin: vi.fn(), isSuperAdmin: vi.fn() }));
vi.mock('@/lib/db/withRequestGuc', () => ({ withApiGuc: (fn: unknown) => fn }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: vi.fn() }));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/audit/log', () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
  auditRequestMeta: vi.fn(() => ({ method: 'GET', path: '/api/admin/outcomes/snapshot' })),
}));
vi.mock('@/lib/admin/boardOutcomes', () => ({
  getBoardSnapshot: vi.fn(),
  formatBoardSnapshotMarkdown: vi.fn(() => '# Snapshot'),
  formatBoardSnapshotPdf: vi.fn(async () => Buffer.from('%PDF-1.7\nmock-pdf')),
}));

import { GET } from '@/app/api/admin/outcomes/snapshot/route';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { getBoardSnapshot } from '@/lib/admin/boardOutcomes';

const snapshot = {
  generatedAt: new Date('2026-07-03T12:00:00Z'),
  smallSampleThreshold: 10,
  applicationFunnel: { total: 10, pending: 2, approved: 5, denied: 1, needsInfo: 2 },
  outcomes: {
    period: { label: 'All time', startDate: null, endDate: new Date('2026-07-03T12:00:00Z') },
    totals: {
      membersServed: 10,
      membersEnrolled: 10,
      membersInTraining: 4,
      membersCertified: 3,
      membersPlaced: 2,
      placementRate: 20,
      medianAnnualSalary: 60000,
      totalAnnualSalaryValue: 120000,
      averageWeeksToPlacement: 8,
    },
    funnel: [
      { stage: 'Enrolled', count: 10 },
      { stage: 'Placed', count: 2 },
    ],
    demographics: {
      veteranBreakdown: [],
      employmentEnteringBreakdown: [],
      incomeBreakdown: [],
      educationBreakdown: [],
      ethnicityBreakdown: [],
    },
    programs: [],
    placements: [],
  },
  activity: { totalMembers: 10, active7d: 4, active14d: 6, active30d: 8, inactive14d: 4 },
  certifications: { totalEarned: 3, earnedLast30d: 1, uniqueMembers: 2 },
  dataQuality: {
    placementsMissingProgram: 0,
    placementsMissingFunding: 0,
    placementsMissingRetention: 0,
    placementsMissingSalary: 0,
    enrolledWithoutEnrolledAt: 0,
  },
  funnelWaterfall: [{ stage: 'Applications', count: 10, previousCount: 10, conversionRate: 100 }],
  applicationQueueHealth: { pendingCount: 2, medianAgeDays: 3, oldestAgeDays: 7 },
  cohorts: [{ month: '2026-06', monthLabel: 'Jun 2026', applications: 4, approved: 3, enrolled: 2, certified: 1, placed: 1 }],
  kpis: {
    totalMembers: 10,
    activeThisWeek: 4,
    qualifiedLeads: 1,
    fundedStarts: 2,
    placementsThisMonth: 1,
    retentionRate: 100,
  },
};

describe('GET /api/admin/outcomes/snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isSuperAdmin).mockResolvedValue(false);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');
    vi.mocked(getBoardSnapshot).mockResolvedValue(snapshot as any);
  });

  it('returns a PDF export when format=pdf', async () => {
    const res = await GET(new Request('http://localhost:3000/api/admin/outcomes/snapshot?period=all-time&format=pdf') as any);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('outcomes-snapshot');
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });
});
