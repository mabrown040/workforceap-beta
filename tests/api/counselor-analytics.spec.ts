import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

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

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(() => Promise.resolve({ role: 'authenticated', userId: 'test-user' })),
}));

vi.mock('@/lib/auth/roles', () => ({
  isSuperAdmin: vi.fn(() => Promise.resolve(false)),
  isAdmin: vi.fn(),
  isCounselor: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => {
  const counselor = {
    findFirst: vi.fn(),
  };
  const counselorAssignment = {
    findMany: vi.fn(),
  };
  const atRiskAlert = {
    findMany: vi.fn(),
  };
  const memberEvent = {
    findMany: vi.fn(),
  };
  const memberProgramProgress = {
    groupBy: vi.fn(),
  };
  const user = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  };
  const $queryRaw = vi.fn();
  const $queryRawUnsafe = vi.fn();
  // Self-referential mock: re-importing '@/lib/db/prisma' from inside this
  // factory resolves the REAL module (vitest does not apply a mock within its
  // own factory), so function-form $transaction callbacks were hitting the
  // actual Prisma client. Hand the callback this mock instead.
  const prismaMock: any = { counselor, counselorAssignment, atRiskAlert, memberEvent, memberProgramProgress, user, $queryRaw, $queryRawUnsafe };
  prismaMock.$transaction = vi.fn(async (arg: any) => (typeof arg === 'function' ? arg(prismaMock) : Promise.all(arg)));
  return { prisma: prismaMock };
});

// ─── Imports after mocks ───
import { GET as getAnalytics } from '@/app/api/counselor/analytics/route';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';

const UUIDS = {
  counselorUser: '550e8400-e29b-41d4-a716-446655440001',
  adminUser: '550e8400-e29b-41d4-a716-446655440002',
  memberUser: '550e8400-e29b-41d4-a716-446655440003',
  counselorId: '550e8400-e29b-41d4-a716-446655440004',
};

describe('GET /api/counselor/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns aggregate analytics for a counselor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);

    vi.mocked(prisma.counselor.findFirst).mockResolvedValue({
      id: UUIDS.counselorId,
      userId: UUIDS.counselorUser,
    } as any);

    vi.mocked(prisma.counselorAssignment.findMany).mockResolvedValue([
      {
        id: 'assign-1',
        memberId: UUIDS.memberUser,
        member: {
          id: UUIDS.memberUser,
          enrolledProgram: 'comptia-a-plus',
          createdAt: new Date('2026-01-01'),
          memberProgramProgress: [
            { programSlug: 'comptia-a-plus', averagePercent: 65, coursesCompleted: 2 },
          ],
        },
      },
    ] as any);

    vi.mocked(prisma.atRiskAlert.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.memberEvent.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.memberProgramProgress.groupBy).mockResolvedValue([
      { programSlug: 'comptia-a-plus', _avg: { averagePercent: 60 }, _count: { userId: 5 } },
    ] as any);

    const res = await getAnalytics(new Request('http://localhost'));
    // DEBUG
    console.log('DEBUG tx calls:', vi.mocked(prisma.$transaction).mock.calls.length,
      'memberEvent calls:', vi.mocked(prisma.memberEvent.findMany).mock.calls.length,
      'atRisk calls:', vi.mocked(prisma.atRiskAlert.findMany).mock.calls.length);
    await prisma.$transaction(async (tx: any) => {
      console.log('DEBUG tx.memberEvent === prisma.memberEvent:', tx.memberEvent === prisma.memberEvent,
        'tx keys:', Object.keys(tx).join(','),
        'tx.memberEvent.findMany is mock:', !!tx.memberEvent?.findMany?.mock);
      return null;
    });
    const txArgs = vi.mocked(prisma.$transaction).mock.calls.map((c: any) => typeof c[0]);
    console.log('DEBUG txArgs:', txArgs.join(','));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalMembers).toBe(1);
    expect(body.activeMembers).toBe(1);
    expect(body.atRiskMembers).toBe(0);
    expect(body.avgProgress).toBe(65);
    expect(body.progressDistribution).toHaveLength(4);
    expect(body.byProgram).toHaveLength(1);
    expect(body.byProgram[0].program).toBe('comptia-a-plus');
    expect(body.byStatus).toHaveLength(2);
  });

  it('flags at-risk members correctly', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);

    vi.mocked(prisma.counselor.findFirst).mockResolvedValue({
      id: UUIDS.counselorId,
      userId: UUIDS.counselorUser,
    } as any);

    vi.mocked(prisma.counselorAssignment.findMany).mockResolvedValue([
      {
        id: 'assign-1',
        memberId: UUIDS.memberUser,
        member: {
          id: UUIDS.memberUser,
          enrolledProgram: 'comptia-a-plus',
          createdAt: new Date('2026-01-01'),
          memberProgramProgress: [{ programSlug: 'comptia-a-plus', averagePercent: 20, coursesCompleted: 0 }],
        },
      },
    ] as any);

    vi.mocked(prisma.atRiskAlert.findMany).mockResolvedValue([
      { userId: UUIDS.memberUser, score: 55 },
    ] as any);
    vi.mocked(prisma.memberEvent.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.memberProgramProgress.groupBy).mockResolvedValue([] as any);

    const res = await getAnalytics(new Request('http://localhost'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.atRiskMembers).toBe(1);
    expect(body.atRiskList).toHaveLength(1);
    expect(body.atRiskList[0].riskScore).toBe(55);
    expect(body.atRiskList[0].riskLevel).toBe('HIGH');
  });

  it('returns empty for admin with no counselor record', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.adminUser, email: 'admin@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isCounselor).mockResolvedValue(false);
    vi.mocked(prisma.counselor.findFirst).mockResolvedValue(null);

    const res = await getAnalytics(new Request('http://localhost'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalMembers).toBe(0);
    expect(body.activeMembers).toBe(0);
    expect(body.byProgram).toEqual([]);
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    const res = await getAnalytics(new Request('http://localhost'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 for non-counselor / non-admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.memberUser, email: 'member@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);
    vi.mocked(prisma.counselor.findFirst).mockResolvedValue(null);

    const res = await getAnalytics(new Request('http://localhost'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 403 when counselor record not found and not admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(prisma.counselor.findFirst).mockResolvedValue(null);

    const res = await getAnalytics(new Request('http://localhost'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 500 on unexpected database error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(prisma.counselor.findFirst).mockRejectedValue(new Error('DB connection lost'));

    const res = await getAnalytics(new Request('http://localhost'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});
