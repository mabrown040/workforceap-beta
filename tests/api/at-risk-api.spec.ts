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

vi.mock('@/lib/db/prisma', () => {
  const atRiskAlert = {
    findMany: vi.fn(),
    findFirst: vi.fn(async () => ({ id: 'alert-1' })),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  };
  const memberEvent = {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  };
  const user = {
    findMany: vi.fn(),
  };
  const prismaMock: any = { atRiskAlert, memberEvent, user };
  prismaMock.$transaction = vi.fn(async (arg: any) => (typeof arg === 'function' ? arg(prismaMock) : Promise.all(arg)));
  return { prisma: prismaMock };
});

vi.mock('@/lib/auth/server', () => ({
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isSuperAdmin: vi.fn(() => Promise.resolve(false)),
  isAdmin: vi.fn(),
  isCounselor: vi.fn(),
  requireAdminOrCounselor: vi.fn(),
}));

vi.mock('@/lib/member/atRiskScoring', () => ({
  getRiskLevel: vi.fn((score: number) => {
    if (score >= 70) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }),
  THRESHOLDS: { CRITICAL: 70, HIGH: 50, MEDIUM: 30, LOW: 0 },
}));

vi.mock('@/lib/counselor/staffMemberAccess', () => ({
  assertStaffCanAccessMemberRecord: vi.fn(),
}));

// ─── Imports after mocks ───
import { GET as getAtRiskMembers, PATCH as patchAtRiskMembers } from '@/app/api/admin/members/at-risk/route';
import { GET as getActivityTimeline } from '@/app/api/counselor/members/[memberId]/activity-timeline/route';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor, requireAdminOrCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';

// ─── Helpers ───
function makeRequest(url: string, init?: RequestInit): any {
  return new Request(url, init);
}

// ─── Tests: GET /api/admin/members/at-risk ───
describe('GET /api/admin/members/at-risk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns at-risk members sorted by score desc', async () => {
    vi.mocked(requireAdminOrCounselor).mockResolvedValue({ ok: true, userId: 'user-1' } as any);
    vi.mocked(prisma.atRiskAlert.findMany).mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'u1',
        score: 75,
        factors: [{ name: 'NO_LOGIN', weight: 25, description: 'No login in 7 days' }],
        status: 'open',
        createdAt: new Date('2026-05-01'),
        updatedAt: new Date('2026-05-01'),
        user: {
          id: 'u1',
          fullName: 'Alice',
          email: 'alice@example.com',
          enrolledProgram: 'data-analytics',
          enrolledAt: new Date('2026-04-01'),
          createdAt: new Date('2026-04-01'),
          lastCourseraAutoSyncAt: null,
          phone: null,
          profile: { employmentStatus: 'unemployed', educationLevel: 'high_school' },
        },
      },
      {
        id: 'alert-2',
        userId: 'u2',
        score: 55,
        factors: [],
        status: 'acknowledged',
        createdAt: new Date('2026-05-02'),
        updatedAt: new Date('2026-05-02'),
        user: {
          id: 'u2',
          fullName: 'Bob',
          email: 'bob@example.com',
          enrolledProgram: null,
          enrolledAt: null,
          createdAt: new Date('2026-04-02'),
          lastCourseraAutoSyncAt: null,
          phone: null,
          profile: null,
        },
      },
    ] as any);
    vi.mocked(prisma.memberEvent.groupBy).mockResolvedValue([]);

    const req = makeRequest('http://localhost/api/admin/members/at-risk?threshold=0&limit=20');
    const res = await getAtRiskMembers(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(2);
    expect(body.results[0].score).toBe(75);
    expect(body.results[0].riskLevel).toBe('CRITICAL');
    expect(body.results[1].riskLevel).toBe('HIGH');
  });

  it('filters by status param', async () => {
    vi.mocked(requireAdminOrCounselor).mockResolvedValue({ ok: true, userId: 'user-1' } as any);
    vi.mocked(prisma.atRiskAlert.findMany).mockResolvedValue([]);
    vi.mocked(prisma.memberEvent.groupBy).mockResolvedValue([]);

    const req = makeRequest('http://localhost/api/admin/members/at-risk?status=open');
    const res = await getAtRiskMembers(req);
    expect(res.status).toBe(200);
    expect(prisma.atRiskAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'open' }),
      })
    );
  });

  it('defaults to open, acknowledged, escalated when no status', async () => {
    vi.mocked(requireAdminOrCounselor).mockResolvedValue({ ok: true, userId: 'user-1' } as any);
    vi.mocked(prisma.atRiskAlert.findMany).mockResolvedValue([]);
    vi.mocked(prisma.memberEvent.groupBy).mockResolvedValue([]);

    const req = makeRequest('http://localhost/api/admin/members/at-risk');
    await getAtRiskMembers(req);
    expect(prisma.atRiskAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['open', 'acknowledged', 'escalated'] },
        }),
      })
    );
  });
});

// ─── Tests: PATCH /api/admin/members/at-risk ───
describe('PATCH /api/admin/members/at-risk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('acknowledges an alert', async () => {
    vi.mocked(requireAdminOrCounselor).mockResolvedValue({ ok: true, userId: 'counselor-1' } as any);
    vi.mocked(prisma.atRiskAlert.update).mockResolvedValue({
      id: 'alert-1',
      status: 'acknowledged',
    } as any);

    const req = makeRequest('http://localhost/api/admin/members/at-risk', {
      method: 'PATCH',
      body: JSON.stringify({ alertId: 'alert-1', status: 'acknowledged' }),
    });
    const res = await patchAtRiskMembers(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(prisma.atRiskAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'acknowledged',
          acknowledgedAt: expect.any(Date),
          counselorId: 'counselor-1',
        }),
      })
    );
  });

  it('resolves an alert', async () => {
    vi.mocked(requireAdminOrCounselor).mockResolvedValue({ ok: true, userId: 'counselor-1' } as any);
    vi.mocked(prisma.atRiskAlert.update).mockResolvedValue({
      id: 'alert-1',
      status: 'resolved',
    } as any);

    const req = makeRequest('http://localhost/api/admin/members/at-risk', {
      method: 'PATCH',
      body: JSON.stringify({ alertId: 'alert-1', status: 'resolved' }),
    });
    const res = await patchAtRiskMembers(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(prisma.atRiskAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'resolved',
          resolvedAt: expect.any(Date),
        }),
      })
    );
  });

  it('escalates an alert', async () => {
    vi.mocked(requireAdminOrCounselor).mockResolvedValue({ ok: true, userId: 'counselor-1' } as any);
    vi.mocked(prisma.atRiskAlert.update).mockResolvedValue({
      id: 'alert-1',
      status: 'escalated',
    } as any);

    const req = makeRequest('http://localhost/api/admin/members/at-risk', {
      method: 'PATCH',
      body: JSON.stringify({ alertId: 'alert-1', status: 'escalated' }),
    });
    const res = await patchAtRiskMembers(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(prisma.atRiskAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'escalated',
          escalatedAt: expect.any(Date),
          counselorId: 'counselor-1',
        }),
      })
    );
  });

  it('returns 400 for invalid status', async () => {
    vi.mocked(requireAdminOrCounselor).mockResolvedValue({ ok: true, userId: 'counselor-1' } as any);

    const req = makeRequest('http://localhost/api/admin/members/at-risk', {
      method: 'PATCH',
      body: JSON.stringify({ alertId: 'alert-1', status: 'invalid' }),
    });
    const res = await patchAtRiskMembers(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid alertId or status');
  });

  it('returns 403 when not admin or counselor', async () => {
    vi.mocked(requireAdminOrCounselor).mockResolvedValue({ ok: false, error: 'Forbidden', status: 403 });

    const req = makeRequest('http://localhost/api/admin/members/at-risk', {
      method: 'PATCH',
      body: JSON.stringify({ alertId: 'alert-1', status: 'acknowledged' }),
    });
    const res = await patchAtRiskMembers(req);
    expect(res.status).toBe(403);
  });
});

// ─── Tests: GET /api/counselor/members/:memberId/activity-timeline ───
describe('GET /api/counselor/members/:memberId/activity-timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns member events for authorized counselor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'counselor-user-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);
    vi.mocked(prisma.memberEvent.findMany).mockResolvedValue([
      {
        id: 'ev-1',
        eventName: 'page_view',
        sourcePage: '/dashboard',
        metadata: null,
        createdAt: new Date('2026-05-10T10:00:00Z'),
      },
      {
        id: 'ev-2',
        eventName: 'course_started',
        sourcePage: null,
        metadata: { courseSlug: 'intro-to-data' },
        createdAt: new Date('2026-05-09T14:00:00Z'),
      },
    ] as any);

    const req = makeRequest('http://localhost/api/counselor/members/member-1/activity-timeline?limit=10');
    const res = await getActivityTimeline(req, { params: Promise.resolve({ memberId: 'member-1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(2);
    expect(body.events[0].eventName).toBe('page_view');
    expect(prisma.memberEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'member-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    );
  });

  it('returns 401 when not logged in', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const req = makeRequest('http://localhost/api/counselor/members/member-1/activity-timeline');
    const res = await getActivityTimeline(req, { params: Promise.resolve({ memberId: 'member-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when not counselor or admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'random-user' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const req = makeRequest('http://localhost/api/counselor/members/member-1/activity-timeline');
    const res = await getActivityTimeline(req, { params: Promise.resolve({ memberId: 'member-1' }) });
    expect(res.status).toBe(403);
  });

  it('returns 403 when counselor cannot access member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'counselor-user-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(false);

    const req = makeRequest('http://localhost/api/counselor/members/member-1/activity-timeline');
    const res = await getActivityTimeline(req, { params: Promise.resolve({ memberId: 'member-1' }) });
    expect(res.status).toBe(403);
  });

  it('caps limit at 100', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'counselor-user-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);
    vi.mocked(prisma.memberEvent.findMany).mockResolvedValue([]);

    const req = makeRequest('http://localhost/api/counselor/members/member-1/activity-timeline?limit=500');
    await getActivityTimeline(req, { params: Promise.resolve({ memberId: 'member-1' }) });
    expect(prisma.memberEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });
});
