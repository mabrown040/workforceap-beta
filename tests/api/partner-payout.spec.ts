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
  requireAdmin: vi.fn(),
  getPartnerForUser: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => {
  const partner = { findUnique: vi.fn(), update: vi.fn() };
  const placementRecord = { findFirst: vi.fn() };
  const memberEvent = { create: vi.fn(async () => ({})) };
  return { prisma: { $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }), partner, placementRecord, memberEvent } };
});

vi.mock('@/lib/stripe/connect', () => ({
  createPayoutTransfer: vi.fn(),
  createConnectAccount: vi.fn(),
  createAccountLink: vi.fn(),
}));

vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: vi.fn(async (_orgId: string, fn: (db: unknown) => Promise<unknown>) => {
    const { prisma } = await import('@/lib/db/prisma');
    return fn(prisma);
  }),
}));

vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(),
}));

vi.mock('@/lib/partner/partnerPayout', () => ({
  getPartnerPlacementPayoutUsd: vi.fn(() => 500),
  buildPartnerPayoutIdempotencyKey: vi.fn(
    (partnerId: string, placementId: string) => `partner-payout:${partnerId}:${placementId}`
  ),
}));

vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(async () => undefined) }));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn(async () => undefined) }));

// ─── Imports after mocks ───
import { POST as payoutPost } from '@/app/api/partner/payout/route';
import { POST as connectPost } from '@/app/api/partner/connect/route';
import { getUser } from '@/lib/auth/server';
import { requireAdmin, getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { createPayoutTransfer, createConnectAccount, createAccountLink } from '@/lib/stripe/connect';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { getPartnerPlacementPayoutUsd } from '@/lib/partner/partnerPayout';
import { NextRequest } from 'next/server';

const UUIDS = {
  partner: '550e8400-e29b-41d4-a716-446655440001',
  partner2: '550e8400-e29b-41d4-a716-446655440002',
  placement: '550e8400-e29b-41d4-a716-446655440003',
  placement2: '550e8400-e29b-41d4-a716-446655440004',
  user: '550e8400-e29b-41d4-a716-446655440005',
  admin: '550e8400-e29b-41d4-a716-446655440006',
  org: '550e8400-e29b-41d4-a716-446655440007',
};

// ─────────────────────────────────────────────
// POST /api/partner/payout
// ─────────────────────────────────────────────
describe('POST /api/partner/payout', () => {
  const makeRequest = (body: Record<string, unknown>) =>
    new NextRequest('http://localhost:3000/api/partner/payout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await payoutPost(makeRequest({ partnerId: UUIDS.partner, placementId: UUIDS.placement }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when user is not an admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(requireAdmin).mockRejectedValue(new Error('Forbidden'));

    const res = await payoutPost(makeRequest({ partnerId: UUIDS.partner, placementId: UUIDS.placement }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden: admin access required' });
  });

  it('returns 400 for invalid body (missing placementId)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.org);

    const res = await payoutPost(makeRequest({ partnerId: UUIDS.partner }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/placementId|Required/);
  });

  it('returns 400 when partner has no Stripe Connect account', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.org);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue({
      stripeConnectId: null,
      stripeConnectStatus: null,
      name: 'Partner A',
      partnerType: 'referral',
    } as any);

    const res = await payoutPost(makeRequest({ partnerId: UUIDS.partner, placementId: UUIDS.placement }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Partner has no connected Stripe account' });
  });

  it('returns 400 when partner Stripe account is not active', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.org);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue({
      stripeConnectId: 'acct_pending',
      stripeConnectStatus: 'pending',
      name: 'Partner B',
      partnerType: 'referral',
    } as any);

    const res = await payoutPost(makeRequest({ partnerId: UUIDS.partner, placementId: UUIDS.placement }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Partner Stripe account is not active' });
  });

  it('creates a $500 Stripe Connect transfer for a valid request', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.org);
    vi.mocked(getPartnerPlacementPayoutUsd).mockReturnValue(500);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue({
      stripeConnectId: 'acct_active',
      stripeConnectStatus: 'active',
      name: 'Partner C',
      partnerType: 'referral',
    } as any);
    vi.mocked(prisma.placementRecord.findFirst).mockResolvedValue({
      id: UUIDS.placement,
      userId: UUIDS.user,
      placedAt: new Date('2026-01-01'),
      startDateVerified: true,
      user: { memberEvents: [] },
    } as any);
    vi.mocked(createPayoutTransfer).mockResolvedValue({ id: 'tr_123' } as any);

    const res = await payoutPost(makeRequest({ partnerId: UUIDS.partner, placementId: UUIDS.placement }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transferId).toBe('tr_123');
    expect(body.amount).toBe(500);

    expect(createPayoutTransfer).toHaveBeenCalledWith(
      500_00,
      'acct_active',
      expect.objectContaining({
        partnerId: UUIDS.partner,
        placementId: UUIDS.placement,
        triggeredBy: UUIDS.admin,
      }),
      `partner-payout:${UUIDS.partner}:${UUIDS.placement}`
    );
  });

  it('uses env-configured payout amount when set', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.org);
    vi.mocked(getPartnerPlacementPayoutUsd).mockReturnValue(750);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue({
      stripeConnectId: 'acct_active',
      stripeConnectStatus: 'active',
      name: 'Partner D',
      partnerType: 'referral',
    } as any);
    vi.mocked(prisma.placementRecord.findFirst).mockResolvedValue({
      id: UUIDS.placement2,
      userId: UUIDS.user,
      placedAt: new Date('2026-01-01'),
      startDateVerified: true,
      user: { memberEvents: [] },
    } as any);
    vi.mocked(createPayoutTransfer).mockResolvedValue({ id: 'tr_456' } as any);

    const res = await payoutPost(makeRequest({ partnerId: UUIDS.partner2, placementId: UUIDS.placement2 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.amount).toBe(750);

    expect(createPayoutTransfer).toHaveBeenCalledWith(
      750_00,
      'acct_active',
      expect.any(Object),
      `partner-payout:${UUIDS.partner2}:${UUIDS.placement2}`
    );
  });

  it('returns 500 on unexpected Stripe transfer error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(getActorOrganizationId).mockResolvedValue(UUIDS.org);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue({
      stripeConnectId: 'acct_active',
      stripeConnectStatus: 'active',
      name: 'Partner E',
      partnerType: 'referral',
    } as any);
    vi.mocked(prisma.placementRecord.findFirst).mockResolvedValue({
      id: UUIDS.placement,
      userId: UUIDS.user,
      placedAt: new Date('2026-01-01'),
      startDateVerified: true,
      user: { memberEvents: [] },
    } as any);
    vi.mocked(createPayoutTransfer).mockRejectedValue(new Error('Transfer declined'));

    const res = await payoutPost(makeRequest({ partnerId: UUIDS.partner, placementId: UUIDS.placement }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});

// ─────────────────────────────────────────────
// POST /api/partner/connect
// ─────────────────────────────────────────────
describe('POST /api/partner/connect', () => {
  const makeRequest = () =>
    new NextRequest('http://localhost:3000/api/partner/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await connectPost(makeRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when user is not a partner', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user, email: 'user@example.com' } as any);
    vi.mocked(getPartnerForUser).mockResolvedValue(null);

    const res = await connectPost(makeRequest());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden: partner access required' });
  });

  it('returns 404 when partner record is not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user, email: 'user@example.com' } as any);
    vi.mocked(getPartnerForUser).mockResolvedValue({ partnerId: UUIDS.partner, partner: { name: 'Test' }, hasDirectPartnerLink: true } as any);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue(null);

    const res = await connectPost(makeRequest());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Partner not found' });
  });

  it('creates a new Connect account and returns onboarding URL when no account exists', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user, email: 'user@example.com' } as any);
    vi.mocked(getPartnerForUser).mockResolvedValue({ partnerId: UUIDS.partner, partner: { name: 'Test' }, hasDirectPartnerLink: true } as any);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue({
      id: UUIDS.partner,
      organizationId: UUIDS.org,
      stripeConnectId: null,
      contactEmail: 'partner@example.com',
    } as any);
    vi.mocked(createConnectAccount).mockResolvedValue({ id: 'acct_new123' } as any);
    vi.mocked(createAccountLink).mockResolvedValue({ url: 'https://connect.stripe.com/onboarding/acct_new123' } as any);

    const res = await connectPost(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://connect.stripe.com/onboarding/acct_new123');

    expect(createConnectAccount).toHaveBeenCalledWith(UUIDS.partner, 'partner@example.com');
    expect(createAccountLink).toHaveBeenCalledWith(
      'acct_new123',
      expect.stringContaining('/partner?connect=refresh'),
      expect.stringContaining('/partner?connect=success')
    );
  });

  it('reuses existing Connect account and returns onboarding URL', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user, email: 'user@example.com' } as any);
    vi.mocked(getPartnerForUser).mockResolvedValue({ partnerId: UUIDS.partner, partner: { name: 'Test' }, hasDirectPartnerLink: true } as any);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue({
      id: UUIDS.partner,
      organizationId: UUIDS.org,
      stripeConnectId: 'acct_existing',
      contactEmail: 'partner@example.com',
    } as any);
    vi.mocked(createAccountLink).mockResolvedValue({ url: 'https://connect.stripe.com/onboarding/acct_existing' } as any);

    const res = await connectPost(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://connect.stripe.com/onboarding/acct_existing');

    expect(createConnectAccount).not.toHaveBeenCalled();
    expect(createAccountLink).toHaveBeenCalledWith(
      'acct_existing',
      expect.stringContaining('/partner?connect=refresh'),
      expect.stringContaining('/partner?connect=success')
    );
  });

  it('falls back to user email when partner has no contact email', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user, email: 'user@example.com' } as any);
    vi.mocked(getPartnerForUser).mockResolvedValue({ partnerId: UUIDS.partner, partner: { name: 'Test' }, hasDirectPartnerLink: true } as any);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue({
      id: UUIDS.partner,
      organizationId: UUIDS.org,
      stripeConnectId: null,
      contactEmail: null,
    } as any);
    vi.mocked(createConnectAccount).mockResolvedValue({ id: 'acct_new456' } as any);
    vi.mocked(createAccountLink).mockResolvedValue({ url: 'https://connect.stripe.com/onboarding/acct_new456' } as any);

    const res = await connectPost(makeRequest());
    expect(res.status).toBe(200);

    expect(createConnectAccount).toHaveBeenCalledWith(UUIDS.partner, 'user@example.com');
  });

  it('returns 500 on unexpected error during onboarding', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user, email: 'user@example.com' } as any);
    vi.mocked(getPartnerForUser).mockResolvedValue({ partnerId: UUIDS.partner, partner: { name: 'Test' }, hasDirectPartnerLink: true } as any);
    vi.mocked(prisma.partner.findUnique).mockRejectedValue(new Error('DB failure'));

    const res = await connectPost(makeRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
