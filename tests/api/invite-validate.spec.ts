import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    invitation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/content/programs', () => ({
  getProgramBySlug: vi.fn(() => null),
}));

vi.mock('@/lib/public/publicDataFilters', () => ({
  sanitizePublicPartnerLabel: (s: string) => s,
  sanitizePublicSubgroupLabel: (s: string) => s,
}));

import { GET } from '@/app/api/invite/validate/route';
import { prisma } from '@/lib/db/prisma';

const req = (token?: string) => {
  const url = token
    ? `http://localhost:3000/api/invite/validate?token=${token}`
    : 'http://localhost:3000/api/invite/validate';
  return new Request(url);
};

describe('GET /api/invite/validate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when token missing', async () => {
    const res = await GET(req() as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it('returns 400 when token too short', async () => {
    const res = await GET(req('short') as any);
    expect(res.status).toBe(400);
  });

  it('returns 404 when invitation not found', async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(null);
    const res = await GET(req('a'.repeat(40)) as any);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it('returns 400 when invitation already accepted', async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      id: 'i1',
      status: 'accepted',
      email: 'a@b.com',
      role: 'student',
      expiresAt: new Date(Date.now() + 100000),
      invitedBy: { fullName: 'Mike' },
      subgroup: null,
      partner: null,
      programSlug: null,
    } as any);

    const res = await GET(req('a'.repeat(40)) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Already accepted');
  });

  it('marks expired and returns 400 when past expiration', async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      id: 'i1',
      status: 'pending',
      email: 'a@b.com',
      role: 'student',
      expiresAt: new Date(Date.now() - 10000),
      invitedBy: { fullName: 'Mike' },
      subgroup: null,
      partner: null,
      programSlug: null,
    } as any);
    vi.mocked(prisma.invitation.update).mockResolvedValue({} as any);

    const res = await GET(req('a'.repeat(40)) as any);
    expect(res.status).toBe(400);
    expect(prisma.invitation.update).toHaveBeenCalled();
  });

  it('returns valid invitation details for pending token', async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      id: 'i1',
      status: 'pending',
      email: 'jane@example.com',
      role: 'partner',
      expiresAt: new Date(Date.now() + 100000),
      invitedBy: { fullName: 'Mike Brown' },
      subgroup: { id: 's1', name: 'Cohort 1' },
      partner: { id: 'p1', name: 'Acme Partner' },
      programSlug: null,
    } as any);

    const res = await GET(req('a'.repeat(40)) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.email).toBe('jane@example.com');
    expect(body.roleLabel).toBe('Partner');
    expect(body.inviterName).toBe('Mike Brown');
  });

  it('returns 500 on db error', async () => {
    vi.mocked(prisma.invitation.findUnique).mockRejectedValue(new Error('boom'));
    const res = await GET(req('a'.repeat(40)) as any);
    expect(res.status).toBe(500);
  });
});
