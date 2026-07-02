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
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}));

vi.mock('@/lib/auth/server', () => ({
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isSuperAdmin: vi.fn(() => Promise.resolve(false)),
  isAdmin: vi.fn(),
  isCounselor: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    counselorAssignment: {
      findFirst: vi.fn(),
    },
    user: {
      findFirst: vi.fn(async () => ({ id: 'member-1' })),
    },
  },
}));

vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(async () => 'org-1'),
  getDefaultOrganizationId: vi.fn(async () => 'org-1'),
}));

vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: vi.fn(async (_orgId: any, fn: any) => {
    const { prisma } = await import('@/lib/db/prisma');
    return fn(prisma);
  }),
}));

vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(async () => undefined) }));

vi.mock('@/lib/counselor/staffMemberAccess', () => ({
  assertStaffCanAccessMemberRecord: vi.fn(),
}));

vi.mock('@/lib/member/points', () => ({
  awardPoints: vi.fn(),
}));

// ─── Imports after mocks ───
import { POST as adminAwardPoints } from '@/app/api/admin/members/[id]/award-points/route';
import { POST as counselorAwardPoints } from '@/app/api/counselor/members/[memberId]/award-points/route';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';
import { awardPoints } from '@/lib/member/points';

const UUIDS = {
  admin: '550e8400-e29b-41d4-a716-446655440001',
  counselor: '550e8400-e29b-41d4-a716-446655440002',
  member: '550e8400-e29b-41d4-a716-446655440003',
};

function makeRequest(body: Record<string, unknown>): any {
  return new Request('http://localhost:3000/api/award-points', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────
// POST /api/admin/members/[id]/award-points

describe('POST /api/admin/members/[id]/award-points', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('awards points to a member as admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isCounselor).mockResolvedValue(false);
    vi.mocked(awardPoints).mockResolvedValue({
      awarded: true,
      points: 50,
      total: 250,
      level: 'builder',
    });

    const req = makeRequest({ points: 50, note: 'Great job on the interview!' });
    const res = await adminAwardPoints(req, { params: Promise.resolve({ id: UUIDS.member }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.awarded).toBe(true);
    expect(body.points).toBe(50);
    expect(body.total).toBe(250);
    expect(body.level).toBe('builder');
    expect(awardPoints).toHaveBeenCalledWith(
      UUIDS.member,
      'counselor_bonus',
      expect.stringMatching(/^bonus-\d+$/),
      50,
      { note: 'Great job on the interview!', awardedBy: UUIDS.admin }
    );
  });

  it('awards points to a member as counselor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselor, email: 'counselor@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(awardPoints).mockResolvedValue({
      awarded: true,
      points: 100,
      total: 300,
      level: 'builder',
    });

    const req = makeRequest({ points: 100 });
    const res = await adminAwardPoints(req, { params: Promise.resolve({ id: UUIDS.member }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.points).toBe(100);
  });

  it('returns 401 for unauthenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const req = makeRequest({ points: 50 });
    const res = await adminAwardPoints(req, { params: Promise.resolve({ id: UUIDS.member }) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
    expect(awardPoints).not.toHaveBeenCalled();
  });

  it('returns 403 for non-admin non-counselor user', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.member, email: 'member@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const req = makeRequest({ points: 50 });
    const res = await adminAwardPoints(req, { params: Promise.resolve({ id: UUIDS.member }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
    expect(awardPoints).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const req = new Request('http://localhost:3000/api/admin/members/[id]/award-points', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    const res = await adminAwardPoints(req, { params: Promise.resolve({ id: UUIDS.member }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON');
  });

  it('returns 400 when points is less than 1', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const req = makeRequest({ points: 0 });
    const res = await adminAwardPoints(req, { params: Promise.resolve({ id: UUIDS.member }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Points must be between 1 and 1000');
    expect(awardPoints).not.toHaveBeenCalled();
  });

  it('returns 400 when points exceeds 1000', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const req = makeRequest({ points: 1500 });
    const res = await adminAwardPoints(req, { params: Promise.resolve({ id: UUIDS.member }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Points must be between 1 and 1000');
    expect(awardPoints).not.toHaveBeenCalled();
  });

  it('returns 400 when points is not a number', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const req = makeRequest({ points: 'fifty' });
    const res = await adminAwardPoints(req, { params: Promise.resolve({ id: UUIDS.member }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Points must be between 1 and 1000');
    expect(awardPoints).not.toHaveBeenCalled();
  });

  it('truncates note to 500 characters', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isCounselor).mockResolvedValue(false);
    vi.mocked(awardPoints).mockResolvedValue({
      awarded: true,
      points: 10,
      total: 100,
      level: 'starter',
    });

    const longNote = 'a'.repeat(600);
    const req = makeRequest({ points: 10, note: longNote });
    const res = await adminAwardPoints(req, { params: Promise.resolve({ id: UUIDS.member }) });

    expect(res.status).toBe(200);
    expect(awardPoints).toHaveBeenCalledWith(
      UUIDS.member,
      'counselor_bonus',
      expect.any(String),
      10,
      { note: 'a'.repeat(500), awardedBy: UUIDS.admin }
    );
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isCounselor).mockResolvedValue(false);
    vi.mocked(awardPoints).mockRejectedValue(new Error('DB connection lost'));

    const req = makeRequest({ points: 50 });
    const res = await adminAwardPoints(req, { params: Promise.resolve({ id: UUIDS.member }) });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});

// ─────────────────────────────────────────────
// POST /api/counselor/members/[memberId]/award-points

describe('POST /api/counselor/members/[memberId]/award-points', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('awards points to an assigned member as counselor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselor, email: 'counselor@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);
    vi.mocked(awardPoints).mockResolvedValue({
      awarded: true,
      points: 75,
      total: 275,
      level: 'builder',
    });

    const req = makeRequest({ points: 75, note: 'Completed resume rewrite' });
    const res = await counselorAwardPoints(req, { params: Promise.resolve({ memberId: UUIDS.member }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.awarded).toBe(true);
    expect(body.points).toBe(75);
    expect(body.total).toBe(275);
    expect(awardPoints).toHaveBeenCalledWith(
      UUIDS.member,
      'counselor_bonus',
      expect.stringMatching(/^bonus-\d+$/),
      75,
      { note: 'Completed resume rewrite', awardedBy: UUIDS.counselor }
    );
  });

  it('awards points as admin (bypasses assignment check)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isCounselor).mockResolvedValue(false);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);
    vi.mocked(awardPoints).mockResolvedValue({
      awarded: true,
      points: 25,
      total: 125,
      level: 'starter',
    });

    const req = makeRequest({ points: 25 });
    const res = await counselorAwardPoints(req, { params: Promise.resolve({ memberId: UUIDS.member }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.points).toBe(25);
  });

  it('returns 401 for unauthenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const req = makeRequest({ points: 50 });
    const res = await counselorAwardPoints(req, { params: Promise.resolve({ memberId: UUIDS.member }) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
    expect(awardPoints).not.toHaveBeenCalled();
  });

  it('returns 403 for non-admin non-counselor user', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.member, email: 'member@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const req = makeRequest({ points: 50 });
    const res = await counselorAwardPoints(req, { params: Promise.resolve({ memberId: UUIDS.member }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
    expect(awardPoints).not.toHaveBeenCalled();
  });

  it('returns 403 when counselor cannot access member record', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselor, email: 'counselor@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(false);

    const req = makeRequest({ points: 50 });
    const res = await counselorAwardPoints(req, { params: Promise.resolve({ memberId: UUIDS.member }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
    expect(awardPoints).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselor, email: 'counselor@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);

    const req = new Request('http://localhost:3000/api/counselor/members/[memberId]/award-points', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    const res = await counselorAwardPoints(req, { params: Promise.resolve({ memberId: UUIDS.member }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON');
  });

  it('returns 400 when points is less than 1', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselor, email: 'counselor@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);

    const req = makeRequest({ points: -5 });
    const res = await counselorAwardPoints(req, { params: Promise.resolve({ memberId: UUIDS.member }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Points must be between 1 and 1000');
    expect(awardPoints).not.toHaveBeenCalled();
  });

  it('returns 400 when points exceeds 1000', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselor, email: 'counselor@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);

    const req = makeRequest({ points: 2000 });
    const res = await counselorAwardPoints(req, { params: Promise.resolve({ memberId: UUIDS.member }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Points must be between 1 and 1000');
    expect(awardPoints).not.toHaveBeenCalled();
  });

  it('returns 400 when points is not a number', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselor, email: 'counselor@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);

    const req = makeRequest({ points: null });
    const res = await counselorAwardPoints(req, { params: Promise.resolve({ memberId: UUIDS.member }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Points must be between 1 and 1000');
    expect(awardPoints).not.toHaveBeenCalled();
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselor, email: 'counselor@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);
    vi.mocked(awardPoints).mockRejectedValue(new Error('DB connection lost'));

    const req = makeRequest({ points: 50 });
    const res = await counselorAwardPoints(req, { params: Promise.resolve({ memberId: UUIDS.member }) });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});
