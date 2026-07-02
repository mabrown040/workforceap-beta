import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      }),
  },
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    courseEnrollment: { findMany: vi.fn() },
    courseProgress: { findMany: vi.fn() },
  },
}));

import { GET } from '@/app/api/member/enrollments/route';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const req = (qs = '') =>
  new Request(`http://localhost:3000/api/member/enrollments${qs}`);

describe('GET /api/member/enrollments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('returns empty list when user has no enrollments', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.courseEnrollment.findMany).mockResolvedValue([]);
    vi.mocked(prisma.courseProgress.findMany).mockResolvedValue([]);

    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enrollments).toEqual([]);
  });

  it('derives status NOT_STARTED with no progress', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.courseEnrollment.findMany).mockResolvedValue([
      { id: 'e1', userId: 'u1', programSlug: 'cyber', enrolledAt: new Date() } as any,
    ]);
    vi.mocked(prisma.courseProgress.findMany).mockResolvedValue([]);

    const res = await GET(req());
    const body = await res.json();
    expect(body.enrollments[0].status).toBe('NOT_STARTED');
    expect(body.enrollments[0].progress.overallPercent).toBe(0);
  });

  it('derives status IN_PROGRESS and computes overall percent', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.courseEnrollment.findMany).mockResolvedValue([
      { id: 'e1', userId: 'u1', programSlug: 'cyber', enrolledAt: new Date() } as any,
    ]);
    vi.mocked(prisma.courseProgress.findMany).mockResolvedValue([
      { programSlug: 'cyber', status: 'IN_PROGRESS', percentComplete: 40 } as any,
      { programSlug: 'cyber', status: 'COMPLETED', percentComplete: 100 } as any,
    ]);

    const res = await GET(req());
    const body = await res.json();
    expect(body.enrollments[0].status).toBe('IN_PROGRESS');
    expect(body.enrollments[0].progress.overallPercent).toBe(70);
  });

  it('derives status COMPLETED when all progress is COMPLETED', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.courseEnrollment.findMany).mockResolvedValue([
      { id: 'e1', userId: 'u1', programSlug: 'cyber', enrolledAt: new Date() } as any,
    ]);
    vi.mocked(prisma.courseProgress.findMany).mockResolvedValue([
      { programSlug: 'cyber', status: 'COMPLETED', percentComplete: 100 } as any,
    ]);

    const res = await GET(req());
    const body = await res.json();
    expect(body.enrollments[0].status).toBe('COMPLETED');
  });

  it('filters by status query param', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.courseEnrollment.findMany).mockResolvedValue([
      { id: 'e1', userId: 'u1', programSlug: 'cyber', enrolledAt: new Date() } as any,
      { id: 'e2', userId: 'u1', programSlug: 'cloud', enrolledAt: new Date() } as any,
    ]);
    vi.mocked(prisma.courseProgress.findMany).mockResolvedValue([
      { programSlug: 'cyber', status: 'COMPLETED', percentComplete: 100 } as any,
    ]);

    const res = await GET(req('?status=COMPLETED'));
    const body = await res.json();
    expect(body.enrollments).toHaveLength(1);
    expect(body.enrollments[0].programSlug).toBe('cyber');
  });

  it('returns 500 on db error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.courseEnrollment.findMany).mockRejectedValue(new Error('boom'));
    const res = await GET(req());
    expect(res.status).toBe(500);
  });
});
