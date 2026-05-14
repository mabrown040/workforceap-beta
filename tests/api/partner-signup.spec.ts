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
      redirect: (url: string, init?: ResponseInit) =>
        new Response(null, { status: 302, headers: { location: url, ...(init?.headers || {}) } }),
    },
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn() })),
}));

const mockSetCookie = vi.fn();
vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  setAuthCookie: vi.fn(),
  resolveAuthGucContext: vi.fn(() => Promise.resolve({ userId: 'test-user-id', orgId: null, roles: [] })),
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: vi.fn(),
      },
    },
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) })),
  },
}));

vi.mock('@/lib/supabase-client', () => ({
  supabaseClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(),
    },
  })),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    profile: {
      create: vi.fn(),
    },
    partner: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    partnerUser: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    partnerSignupRequest: {
      create: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

vi.mock('@/lib/email/sanitizeSubject', () => ({
  sanitizeEmailSubjectLine: vi.fn((s: string) => s),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'email-1' }),
    },
  })),
}));

// ─── Imports after mocks ───
import { POST as signupPost } from '@/app/api/partner/signup/route';
import { POST as approvePost } from '@/app/api/admin/partners/[id]/approve/route';
import { POST as rejectPost } from '@/app/api/admin/partners/[id]/reject/route';
import { PATCH as contactPatch } from '@/app/api/partner/settings/contact/route';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdmin } from '@/lib/auth/roles';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/roles', () => ({
  getPartnerForUser: vi.fn(),
  isAdmin: vi.fn(),
}));

const UUIDS = {
  admin: '550e8400-e29b-41d4-a716-446655440000',
  user: '550e8400-e29b-41d4-a716-446655440002',
  partner: '550e8400-e29b-41d4-a716-446655440003',
};

function makeSignupRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/partner/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────
// POST /api/partner/signup
// ─────────────────────────────────────────────
describe('POST /api/partner/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for missing required fields', async () => {
    const res = await signupPost(makeSignupRequest({ name: 'Test Org' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/email|name|password/i);
  });

  it('returns 400 for invalid email', async () => {
    const res = await signupPost(
      makeSignupRequest({
        name: 'Test Org',
        email: 'not-an-email',
        password: 'securePass123',
        confirm_password: 'securePass123',
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/email/i);
  });

  it('returns 400 for password mismatch', async () => {
    const res = await signupPost(
      makeSignupRequest({
        name: 'Test Org',
        email: 'test@example.com',
        password: 'securePass123',
        confirm_password: 'differentPass',
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/match/i);
  });

  it('returns 400 for short password', async () => {
    const res = await signupPost(
      makeSignupRequest({
        name: 'Test Org',
        email: 'test@example.com',
        password: 'short',
        confirm_password: 'short',
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/8/i);
  });

  it('returns 409 when email already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: UUIDS.user } as any);

    const res = await signupPost(
      makeSignupRequest({
        name: 'Test Org',
        email: 'existing@example.com',
        password: 'securePass123',
        confirm_password: 'securePass123',
      })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already/i);
  });

  it('creates partner account and redirects on success', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
      data: { user: { id: UUIDS.user } },
      error: null,
    } as any);

    vi.mocked(prisma.$transaction).mockImplementation(async (ops: any[]) => {
      // Simulate creating user, profile, partner, partnerUser
      return [
        { id: UUIDS.user, email: 'new@example.com' },
        { id: 'profile-1' },
        { id: UUIDS.partner, name: 'New Org', slug: 'new-org', referralCode: 'REF123' },
        { id: 'pu-1' },
      ];
    });

    const res = await signupPost(
      makeSignupRequest({
        name: 'New Org',
        email: 'new@example.com',
        password: 'securePass123',
        confirm_password: 'securePass123',
        organizationType: 'nonprofit',
        contactName: 'Jane Doe',
        contactPhone: '512-555-1234',
        referralSource: 'Google',
      })
    );

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/partner');
    expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        password: 'securePass123',
        email_confirm: true,
      })
    );
  });
});

// ─────────────────────────────────────────────
// POST /api/admin/partners/[id]/approve
// ─────────────────────────────────────────────
describe('POST /api/admin/partners/[id]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await approvePost(
      new NextRequest('http://localhost:3000/api/admin/partners/123/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: '123' }) }
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);

    const res = await approvePost(
      new NextRequest('http://localhost:3000/api/admin/partners/123/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: '123' }) }
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when partner not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue(null);

    const res = await approvePost(
      new NextRequest('http://localhost:3000/api/admin/partners/123/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: '123' }) }
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 when partner is not pending', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue({
      id: '123',
      status: 'active',
    } as any);

    const res = await approvePost(
      new NextRequest('http://localhost:3000/api/admin/partners/123/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: '123' }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/not pending/i);
  });

  it('approves a pending partner and sends email', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue({
      id: '123',
      status: 'pending_approval',
      contactEmail: 'partner@example.com',
      contactName: 'Jane',
      name: 'New Org',
      slug: 'new-org',
      referralCode: 'REF123',
    } as any);
    vi.mocked(prisma.partner.update).mockResolvedValue({ id: '123' } as any);

    const res = await approvePost(
      new NextRequest('http://localhost:3000/api/admin/partners/123/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: '123' }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(prisma.partner.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'active',
          active: true,
        }),
      })
    );
  });
});

// ─────────────────────────────────────────────
// POST /api/admin/partners/[id]/reject
// ─────────────────────────────────────────────
describe('POST /api/admin/partners/[id]/reject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);

    const res = await rejectPost(
      new NextRequest('http://localhost:3000/api/admin/partners/123/reject', { method: 'POST' }),
      { params: Promise.resolve({ id: '123' }) }
    );
    expect(res.status).toBe(403);
  });

  it('rejects a pending partner with notes', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue({
      id: '123',
      status: 'pending_approval',
      contactEmail: 'partner@example.com',
      contactName: 'Jane',
      name: 'New Org',
    } as any);
    vi.mocked(prisma.partner.update).mockResolvedValue({ id: '123' } as any);

    const res = await rejectPost(
      new NextRequest('http://localhost:3000/api/admin/partners/123/reject', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: 'Does not meet requirements' }),
      }),
      { params: Promise.resolve({ id: '123' }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(prisma.partner.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'rejected',
          active: false,
          rejectionNotes: 'Does not meet requirements',
        }),
      })
    );
  });
});

// ─────────────────────────────────────────────
// PATCH /api/partner/settings/contact
// ─────────────────────────────────────────────
describe('PATCH /api/partner/settings/contact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await contactPatch(
      new NextRequest('http://localhost:3000/api/partner/settings/contact', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contactName: 'New Name' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when not a partner', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    const { getPartnerForUser } = await import('@/lib/auth/roles');
    vi.mocked(getPartnerForUser).mockResolvedValue(null);

    const res = await contactPatch(
      new NextRequest('http://localhost:3000/api/partner/settings/contact', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contactName: 'New Name' }),
      })
    );
    expect(res.status).toBe(403);
  });

  it('updates contact info for partner', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    const { getPartnerForUser } = await import('@/lib/auth/roles');
    vi.mocked(getPartnerForUser).mockResolvedValue({ partnerId: UUIDS.partner } as any);
    vi.mocked(prisma.partner.update).mockResolvedValue({ id: UUIDS.partner } as any);

    const res = await contactPatch(
      new NextRequest('http://localhost:3000/api/partner/settings/contact', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contactName: 'Jane Updated', contactPhone: '512-555-9999' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(prisma.partner.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: UUIDS.partner },
        data: expect.objectContaining({
          contactName: 'Jane Updated',
          contactPhone: '512-555-9999',
        }),
      })
    );
  });
});
