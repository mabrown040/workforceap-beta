import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      }),
  },
  // Route now defers side effects via next/server's after().
  after: (fn: () => unknown) => { void Promise.resolve().then(fn); },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn() })),
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
}));
vi.mock('@/lib/auth/ensureUser', () => ({ ensureUserInDb: vi.fn() }));
vi.mock('@/lib/notifications/partner-notify', () => ({
  sendPartnerMilestoneEmail: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/events/track', () => ({ trackEvent: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/member/points', () => ({ awardPoints: vi.fn(() => Promise.resolve()) }));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    userCertification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { GET, POST } from '@/app/api/member/certifications/route';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const postReq = (body: unknown) =>
  new Request('http://localhost:3000/api/member/certifications', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('GET /api/member/certifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    const res = await GET(new Request('http://localhost'));
    expect(res.status).toBe(401);
  });

  it('returns user certifications for authenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    vi.mocked(prisma.userCertification.findMany).mockResolvedValue([
      { certName: 'AWS', earnedAt: new Date('2026-01-01') } as any,
    ]);
    const res = await GET(new Request('http://localhost'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.certifications).toHaveLength(1);
    expect(body.certifications[0].certName).toBe('AWS');
  });

  it('returns 500 on db error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    vi.mocked(prisma.userCertification.findMany).mockRejectedValue(new Error('boom'));
    const res = await GET(new Request('http://localhost'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/member/certifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    const res = await POST(postReq({ certName: 'AWS', earned: true }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    const res = await POST(postReq('not-json'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing certName', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    const res = await POST(postReq({ earned: true }));
    expect(res.status).toBe(400);
  });

  it('upserts new certification when earned=true', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    vi.mocked(prisma.userCertification.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.userCertification.upsert).mockResolvedValue({} as any);

    const res = await POST(postReq({ certName: 'AWS Cloud Practitioner', earned: true }));
    expect(res.status).toBe(200);
    expect(prisma.userCertification.upsert).toHaveBeenCalled();
  });

  it('deletes certification when earned=false', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    vi.mocked(prisma.userCertification.deleteMany).mockResolvedValue({ count: 1 } as any);

    const res = await POST(postReq({ certName: 'AWS', earned: false }));
    expect(res.status).toBe(200);
    expect(prisma.userCertification.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', certName: 'AWS' },
    });
  });

  it('returns 500 on db error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    vi.mocked(prisma.userCertification.findUnique).mockRejectedValue(new Error('db down'));
    const res = await POST(postReq({ certName: 'AWS', earned: true }));
    expect(res.status).toBe(500);
  });
});
