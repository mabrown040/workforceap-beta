import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
vi.mock('next/server', () => {
  class MockNextRequest extends Request {
    get nextUrl() {
      return new URL(this.url);
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) =>
        new Response(JSON.stringify(body), {
          ...init,
          headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
        }),
    },
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn() })),
}));

vi.mock('@/lib/auth/server', () => ({
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isSuperAdmin: vi.fn(() => Promise.resolve(false)),
  isAdmin: vi.fn(),
}));

vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(),
}));

vi.mock('@/lib/analytics/quarterlyOutcomes', () => ({
  generateQuarterlyOutcomes: vi.fn(),
  getDefaultQuarter: vi.fn(() => ({ quarter: 'Q1', year: 2026 })),
}));

// ─── Imports after mocks ───
import { GET } from '@/app/api/admin/reports/quarterly-outcomes/route';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { generateQuarterlyOutcomes, getDefaultQuarter } from '@/lib/analytics/quarterlyOutcomes';
import { NextRequest } from 'next/server';

describe('GET /api/admin/reports/quarterly-outcomes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await GET(new NextRequest('http://localhost:3000/api/admin/reports/quarterly-outcomes'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 for non-admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);

    const res = await GET(new NextRequest('http://localhost:3000/api/admin/reports/quarterly-outcomes'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('returns quarterly outcomes with default quarter', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');

    const mockReport = {
      quarter: 'Q1',
      year: 2026,
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      generatedAt: '2026-04-01T00:00:00.000Z',
      metrics: {
        totalEnrolled: 50,
        completions: 30,
        placements: 20,
        activeMembers: 5,
        dropOffs: 10,
        dropOffRate: 20,
        avgDaysToPlacement: 45,
        aiToolUsageRate: 75,
        salaryAvg: 55000,
        salaryMedian: 52000,
        salaryMin: 40000,
        salaryMax: 80000,
      },
      programBreakdown: [
        { programSlug: 'cna', enrolled: 25, completions: 15, placements: 10 },
      ],
      placementsList: [
        {
          jobTitle: 'Nurse Assistant',
          employerName: 'Hospital',
          salaryOffered: 52000,
          placedAt: '2026-02-15T00:00:00.000Z',
          daysToPlacement: 30,
          usedAiTools: true,
        },
      ],
    };
    vi.mocked(generateQuarterlyOutcomes).mockResolvedValue(mockReport as any);

    const res = await GET(new NextRequest('http://localhost:3000/api/admin/reports/quarterly-outcomes'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.quarter).toBe('Q1');
    expect(body.year).toBe(2026);
    expect(body.metrics.totalEnrolled).toBe(50);
    expect(body.metrics.completions).toBe(30);
    expect(body.metrics.placements).toBe(20);
    expect(body.metrics.dropOffRate).toBe(20);
    expect(body.metrics.aiToolUsageRate).toBe(75);
    expect(body.programBreakdown).toHaveLength(1);
    expect(body.placementsList).toHaveLength(1);
    expect(getDefaultQuarter).toHaveBeenCalled();
  });

  it('accepts quarter and year query params', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');

    const mockReport = {
      quarter: 'Q2',
      year: 2025,
      periodStart: '2025-04-01',
      periodEnd: '2025-06-30',
      generatedAt: '2025-07-01T00:00:00.000Z',
      metrics: {
        totalEnrolled: 100,
        completions: 60,
        placements: 40,
        activeMembers: 10,
        dropOffs: 20,
        dropOffRate: 20,
        avgDaysToPlacement: 40,
        aiToolUsageRate: 80,
        salaryAvg: 60000,
        salaryMedian: 58000,
        salaryMin: 45000,
        salaryMax: 90000,
      },
      programBreakdown: [],
      placementsList: [],
    };
    vi.mocked(generateQuarterlyOutcomes).mockResolvedValue(mockReport as any);

    const res = await GET(
      new NextRequest('http://localhost:3000/api/admin/reports/quarterly-outcomes?quarter=Q2&year=2025')
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.quarter).toBe('Q2');
    expect(body.year).toBe(2025);
    expect(generateQuarterlyOutcomes).toHaveBeenCalledWith('org-1', { quarter: 'Q2', year: 2025 });
  });

  it('ignores invalid quarter and falls back to default', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');

    const mockReport = {
      quarter: 'Q1',
      year: 2026,
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      generatedAt: '2026-04-01T00:00:00.000Z',
      metrics: { totalEnrolled: 0, completions: 0, placements: 0, activeMembers: 0, dropOffs: 0, dropOffRate: 0, avgDaysToPlacement: null, aiToolUsageRate: null, salaryAvg: null, salaryMedian: null, salaryMin: null, salaryMax: null },
      programBreakdown: [],
      placementsList: [],
    };
    vi.mocked(generateQuarterlyOutcomes).mockResolvedValue(mockReport as any);

    const res = await GET(
      new NextRequest('http://localhost:3000/api/admin/reports/quarterly-outcomes?quarter=invalid&year=abc')
    );
    expect(res.status).toBe(200);
    expect(getDefaultQuarter).toHaveBeenCalled();
  });

  it('returns 500 on internal error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');
    vi.mocked(generateQuarterlyOutcomes).mockRejectedValue(new Error('DB error'));

    const res = await GET(new NextRequest('http://localhost:3000/api/admin/reports/quarterly-outcomes'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
