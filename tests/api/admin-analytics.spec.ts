import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      }),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn() })),
}));

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn: () => Promise<unknown>) => fn),
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdmin: vi.fn(),
}));

vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => {
  const user = {
    count: vi.fn(),
    groupBy: vi.fn(),
    findMany: vi.fn(),
  };
  const placementRecord = {
    count: vi.fn(),
    findMany: vi.fn(),
  };
  const aIToolResult = {
    findMany: vi.fn(),
  };
  const program = {
    findMany: vi.fn(),
  };
  const courseEnrollment = {
    groupBy: vi.fn(),
  };
  const $queryRaw = vi.fn();
  return { prisma: { user, placementRecord, aIToolResult, program, courseEnrollment, $queryRaw } };
});

// ─── Imports after mocks ───
import { GET as getDashboard } from '@/app/api/admin/analytics/dashboard/route';
import { GET as getMembers } from '@/app/api/admin/analytics/members/route';
import { GET as getPrograms } from '@/app/api/admin/analytics/programs/route';
import { GET as getPlacements } from '@/app/api/admin/analytics/placements/route';
import { GET as getAiEfficacy } from '@/app/api/admin/analytics/ai-efficacy/route';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';

const UUIDS = {
  admin: '550e8400-e29b-41d4-a716-446655440001',
  nonAdmin: '550e8400-e29b-41d4-a716-446655440002',
  orgId: '550e8400-e29b-41d4-a716-446655440003',
};

function makeRequest(url: string) {
  return new Request(url, { headers: { 'content-type': 'application/json' } });
}

// ─────────────────────────────────────────────
// GET /api/admin/analytics/dashboard
// ─────────────────────────────────────────────
describe('GET /api/admin/analytics/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dashboard stats for admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.orgId);

    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(100) // totalMembers
      .mockResolvedValueOnce(80)  // enrolledMembers
      .mockResolvedValueOnce(60); // assessmentCompleted

    vi.mocked(prisma.placementRecord.count).mockResolvedValue(20);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ avg: 55000 }] as any);

    const res = await getDashboard();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.totalMembers).toBe(100);
    expect(body.enrolledMembers).toBe(80);
    expect(body.assessmentCompleted).toBe(60);
    expect(body.completionRate).toBe(60);
    expect(body.placementsCount).toBe(20);
    expect(body.placementRate).toBe(25);
    expect(body.avgPlacementSalary).toBe(55000);
  });

  it('returns 401 for unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await getDashboard();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 for non-admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.nonAdmin, email: 'member@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);

    const res = await getDashboard();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('returns zero rates when no members', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.orgId);

    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    vi.mocked(prisma.placementRecord.count).mockResolvedValue(0);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ avg: null }] as any);

    const res = await getDashboard();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completionRate).toBe(0);
    expect(body.placementRate).toBe(0);
    expect(body.avgPlacementSalary).toBe(0);
  });
});

// ─────────────────────────────────────────────
// GET /api/admin/analytics/members
// ─────────────────────────────────────────────
describe('GET /api/admin/analytics/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns member activity over time', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.orgId);

    vi.mocked(prisma.user.groupBy).mockResolvedValue([
      { createdAt: new Date('2026-05-01'), _count: { id: 5 } },
      { createdAt: new Date('2026-05-02'), _count: { id: 3 } },
    ] as any);

    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { day: '2026-05-01', count: 10 },
      { day: '2026-05-02', count: 8 },
    ] as any);

    vi.mocked(prisma.courseEnrollment.groupBy).mockResolvedValue([
      { createdAt: new Date('2026-05-01'), _count: { id: 2 } },
    ] as any);

    const res = await getMembers(makeRequest('http://localhost:3000/api/admin/analytics/members'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.signups).toHaveLength(2);
    expect(body.activeUsers).toHaveLength(2);
    expect(body.enrollments).toHaveLength(1);
    expect(body.signups[0].count).toBe(5);
  });

  it('filters by date range', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.orgId);

    vi.mocked(prisma.user.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    vi.mocked(prisma.courseEnrollment.groupBy).mockResolvedValue([]);

    const res = await getMembers(
      makeRequest('http://localhost:3000/api/admin/analytics/members?startDate=2026-01-01&endDate=2026-01-31')
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.dateRange.start).toContain('2026-01-01');
    expect(body.dateRange.end).toContain('2026-01-31');
  });

  it('returns 401 for unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await getMembers(makeRequest('http://localhost:3000/api/admin/analytics/members'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 for non-admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.nonAdmin, email: 'member@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);

    const res = await getMembers(makeRequest('http://localhost:3000/api/admin/analytics/members'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });
});

// ─────────────────────────────────────────────
// GET /api/admin/analytics/programs
// ─────────────────────────────────────────────
describe('GET /api/admin/analytics/programs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns program enrollment stats', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.orgId);

    vi.mocked(prisma.program.findMany).mockResolvedValue([
      { id: 'prog-1', name: 'Digital Literacy' },
      { id: 'prog-2', name: 'IT Support' },
    ] as any);

    vi.mocked(prisma.user.groupBy).mockResolvedValue([
      { enrolledProgram: 'Digital Literacy', _count: { id: 10 } },
      { enrolledProgram: 'IT Support', _count: { id: 5 } },
    ] as any);

    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { program: 'Digital Literacy', count: 8 },
      { program: 'IT Support', count: 2 },
    ] as any);

    const res = await getPrograms();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.programs).toHaveLength(2);
    expect(body.programs[0].programName).toBe('Digital Literacy');
    expect(body.programs[0].enrolled).toBe(10);
    expect(body.programs[0].completed).toBe(8);
    expect(body.programs[0].completionRate).toBe(80);
    expect(body.programs[1].completionRate).toBe(40);
  });

  it('includes completion rates per program', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.orgId);

    vi.mocked(prisma.program.findMany).mockResolvedValue([{ id: 'prog-1', name: 'New Program' }] as any);
    vi.mocked(prisma.user.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    const res = await getPrograms();
    const body = await res.json();

    expect(body.programs[0].enrolled).toBe(0);
    expect(body.programs[0].completed).toBe(0);
    expect(body.programs[0].completionRate).toBe(0);
  });

  it('returns 401 for unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await getPrograms();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 for non-admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.nonAdmin, email: 'member@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);

    const res = await getPrograms();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });
});

// ─────────────────────────────────────────────
// GET /api/admin/analytics/placements
// ─────────────────────────────────────────────
describe('GET /api/admin/analytics/placements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns placement outcomes', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.orgId);

    vi.mocked(prisma.placementRecord.findMany).mockResolvedValue([
      {
        id: 'place-1',
        employerName: 'TechCorp',
        jobTitle: 'Developer',
        salaryOffered: 60000,
        placedAt: new Date('2026-04-01'),
        user: { id: 'user-1', fullName: 'Alice', email: 'alice@example.com' },
      },
      {
        id: 'place-2',
        employerName: 'HealthInc',
        jobTitle: 'Support',
        salaryOffered: 45000,
        placedAt: new Date('2026-03-15'),
        user: { id: 'user-2', fullName: 'Bob', email: 'bob@example.com' },
      },
    ] as any);

    vi.mocked(prisma.$queryRaw).mockResolvedValue([{
      avg: 52500,
      median: 52500,
      min: 45000,
      max: 60000,
    }] as any);

    const res = await getPlacements();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.placements).toHaveLength(2);
    expect(body.outcomes.total).toBe(2);
    expect(body.outcomes.avgSalary).toBe(52500);
    expect(body.outcomes.medianSalary).toBe(52500);
    expect(body.outcomes.minSalary).toBe(45000);
    expect(body.outcomes.maxSalary).toBe(60000);
  });

  it('includes salary data', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.orgId);

    vi.mocked(prisma.placementRecord.findMany).mockResolvedValue([]);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ avg: null, median: null, min: null, max: null }] as any);

    const res = await getPlacements();
    const body = await res.json();

    expect(body.outcomes.avgSalary).toBe(0);
    expect(body.outcomes.medianSalary).toBe(0);
    expect(body.outcomes.total).toBe(0);
  });

  it('returns 401 for unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await getPlacements();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 for non-admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.nonAdmin, email: 'member@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);

    const res = await getPlacements();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });
});

// ─────────────────────────────────────────────
// GET /api/admin/analytics/ai-efficacy
// ─────────────────────────────────────────────
describe('GET /api/admin/analytics/ai-efficacy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns efficacy report for admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.orgId);

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: 'u1',
        enrolledAt: new Date('2026-04-01'),
        placementRecord: { placedAt: new Date('2026-04-30'), salaryOffered: 50000 },
        _count: { jobApplications: 3 },
      },
      {
        id: 'u2',
        enrolledAt: new Date('2026-04-01'),
        placementRecord: null,
        _count: { jobApplications: 1 },
      },
    ] as any);

    vi.mocked(prisma.aIToolResult.findMany).mockResolvedValue([
      { userId: 'u1', toolType: 'resume_rewriter' },
    ] as any);

    const res = await getAiEfficacy(makeRequest('http://localhost:3000/api/admin/analytics/ai-efficacy'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.overall.anyTool.usersWithTool).toBe(1);
    expect(body.overall.anyTool.usersWithoutTool).toBe(1);
    expect(body.overall.anyTool.placementRateWith).toBe(100);
    expect(body.overall.anyTool.placementRateWithout).toBe(0);
    expect(body.byTool).toHaveLength(1);
    expect(body.byTool[0].toolType).toBe('resume_rewriter');
    expect(body.topTools).toHaveLength(0); // < 3 users
  });

  it('filters by date range', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.orgId);

    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.aIToolResult.findMany).mockResolvedValue([]);

    const res = await getAiEfficacy(
      makeRequest('http://localhost:3000/api/admin/analytics/ai-efficacy?startDate=2026-01-01&endDate=2026-01-31')
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.dateRange.start).toBe('2026-01-01');
    expect(body.dateRange.end).toBe('2026-01-31');
    expect(body.overall.anyTool.usersWithTool).toBe(0);
  });

  it('returns 401 for unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await getAiEfficacy(makeRequest('http://localhost:3000/api/admin/analytics/ai-efficacy'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 for non-admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.nonAdmin, email: 'member@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);

    const res = await getAiEfficacy(makeRequest('http://localhost:3000/api/admin/analytics/ai-efficacy'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });
});
