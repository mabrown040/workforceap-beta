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

vi.mock('@/lib/auth/server', () => ({
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isSuperAdmin: vi.fn(() => Promise.resolve(false)),
  isAdminInOrg: vi.fn(() => Promise.resolve(true)),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    user: {
      findMany: vi.fn(async () => []),
    },
  },
}));

vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(async () => undefined) }));

vi.mock('@/lib/admin/memberMerge', () => ({
  executeMemberMerge: vi.fn(),
  buildMergePreview: vi.fn(),
}));

// ─── Imports after mocks ───
import { GET, POST } from '@/app/api/admin/members/merge/route';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { executeMemberMerge, buildMergePreview } from '@/lib/admin/memberMerge';
import { NextRequest } from 'next/server';

describe('GET /api/admin/members/merge — preview', () => {
  const makeRequest = (search: string) =>
    new NextRequest(`http://localhost:3000/api/admin/members/merge?${search}`, { method: 'GET' });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (arg: any) => (typeof arg === 'function' ? arg(prisma as any) : Promise.all(arg)));
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'p1', organizationId: 'org-1' },
      { id: 's1', organizationId: 'org-1' },
    ] as any);
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await GET(makeRequest('primaryId=a&secondaryId=b'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(requireAdmin).mockRejectedValue(new Error('Forbidden'));

    const res = await GET(makeRequest('primaryId=a&secondaryId=b'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 400 when primaryId and secondaryId are the same', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);

    const res = await GET(makeRequest('primaryId=a&secondaryId=a'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('must differ');
  });

  it('returns 400 when primaryId is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);

    const res = await GET(makeRequest('secondaryId=b'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('required');
  });

  it('returns preview when valid params provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);

    const mockPreview = {
      primary: { id: 'p1', fullName: 'Primary', email: 'p@example.com', phone: null, enrolledProgram: null, assessmentCompleted: false },
      secondary: { id: 's1', fullName: 'Secondary', email: 's@example.com', phone: null, enrolledProgram: null, assessmentCompleted: false },
      conflicts: [],
      relationsToRepoint: [{ model: 'application', field: 'userId', count: 3 }],
      scalarFieldsToMerge: ['phone'],
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(prisma as any));
    vi.mocked(buildMergePreview).mockResolvedValue(mockPreview as any);

    const res = await GET(makeRequest('primaryId=p1&secondaryId=s1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.preview.primary.fullName).toBe('Primary');
    expect(body.preview.relationsToRepoint).toHaveLength(1);
  });

  it('returns 500 when preview throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('DB timeout'));

    const res = await GET(makeRequest('primaryId=p1&secondaryId=s1'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB timeout');
  });
});

describe('POST /api/admin/members/merge — execute', () => {
  const makeRequest = (body: Record<string, unknown>) =>
    new NextRequest('http://localhost:3000/api/admin/members/merge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (arg: any) => (typeof arg === 'function' ? arg(prisma as any) : Promise.all(arg)));
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'p1', organizationId: 'org-1' },
      { id: 's1', organizationId: 'org-1' },
    ] as any);
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await POST(makeRequest({ primaryId: 'a', secondaryId: 'b' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(requireAdmin).mockRejectedValue(new Error('Forbidden'));

    const res = await POST(makeRequest({ primaryId: 'a', secondaryId: 'b' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 400 when ids are the same', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);

    const res = await POST(makeRequest({ primaryId: 'a', secondaryId: 'a' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('must differ');
  });

  it('returns 400 when primaryId is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);

    const res = await POST(makeRequest({ secondaryId: 'b' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('required');
  });

  it('executes merge and returns result on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);

    const mockResult = {
      primaryId: 'p1',
      secondaryId: 's1',
      repointed: ['application(3)', 'goal(1)'],
      mergedFields: ['phone'],
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(prisma as any));
    vi.mocked(executeMemberMerge).mockResolvedValue(mockResult as any);

    const res = await POST(makeRequest({ primaryId: 'p1', secondaryId: 's1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.primaryId).toBe('p1');
    expect(body.repointed).toContain('application(3)');
    expect(body.mergedFields).toContain('phone');

    expect(executeMemberMerge).toHaveBeenCalledWith(expect.anything(), 'p1', 's1', 'admin-1');
  });

  it('returns 500 when merge logic throws with conflict message', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(prisma as any));
    vi.mocked(executeMemberMerge).mockRejectedValue(new Error('Merge blocked by 1 conflict(s): Both members are enrolled in different programs'));

    const res = await POST(makeRequest({ primaryId: 'p1', secondaryId: 's1' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Merge blocked');
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Connection lost'));

    const res = await POST(makeRequest({ primaryId: 'p1', secondaryId: 's1' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Connection lost');
  });
});
