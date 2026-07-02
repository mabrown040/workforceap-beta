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
  getEmployerForUser: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => {
  const employer = {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  };
  return { prisma: { $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }), employer } };
});

vi.mock('@/lib/stripe/client', () => ({
  getStripe: vi.fn(),
  getStripeWebhookSecret: vi.fn(() => 'whsec_test_secret'),
  EMPLOYER_TIERS: {
    basic: { priceId: 'price_basic', name: 'Basic', amount: 19900, jobLimit: 1, features: [] },
    growth: { priceId: 'price_growth', name: 'Growth', amount: 49900, jobLimit: 5, features: [] },
    enterprise: { priceId: 'price_enterprise', name: 'Enterprise', amount: 99900, jobLimit: Infinity, features: [] },
  },
  isValidTier: vi.fn((tier: string) => ['basic', 'growth', 'enterprise'].includes(tier)),
}));

vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: vi.fn(async (_orgId: string, fn: (db: unknown) => Promise<unknown>) => {
    const { prisma } = await import('@/lib/db/prisma');
    return fn(prisma);
  }),
}));

// ─── Imports after mocks ───
import { POST as checkoutPOST } from '@/app/api/employer/checkout/route';
import { POST as webhookPOST } from '@/app/api/employer/webhook/route';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getStripe, isValidTier } from '@/lib/stripe/client';
import { NextRequest } from 'next/server';

describe('POST /api/employer/checkout', () => {
  const makeRequest = (body: Record<string, unknown>) =>
    new NextRequest('http://localhost:3000/api/employer/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await checkoutPOST(makeRequest({ tier: 'basic' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when user has no employer context', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue(null);

    const res = await checkoutPOST(makeRequest({ tier: 'basic' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden: employer access required' });
  });

  it('returns 400 for an invalid tier', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: 'emp-1' } as any);
    vi.mocked(isValidTier).mockReturnValue(false);

    const res = await checkoutPOST(makeRequest({ tier: 'invalid' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid tier' });
  });

  it('returns 404 when employer is not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: 'emp-1' } as any);
    vi.mocked(isValidTier).mockReturnValue(true);
    vi.mocked(prisma.employer.findUnique).mockResolvedValue(null);

    const res = await checkoutPOST(makeRequest({ tier: 'basic' }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Employer not found' });
  });

  it('returns 503 when tier price is not configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: 'emp-1' } as any);
    vi.mocked(isValidTier).mockReturnValue(true);
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({
      organizationId: 'org-1',
      stripeCustomerId: 'cus_123',
      contactEmail: 'acme@example.com',
      companyName: 'Acme Inc',
    } as any);

    // Temporarily clear priceId for basic tier
    const { EMPLOYER_TIERS } = await import('@/lib/stripe/client');
    const original = EMPLOYER_TIERS.basic.priceId;
    (EMPLOYER_TIERS.basic as any).priceId = '';

    const res = await checkoutPOST(makeRequest({ tier: 'basic' }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Price not configured for tier' });

    (EMPLOYER_TIERS.basic as any).priceId = original;
  });

  it('creates checkout session with existing Stripe customer', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: 'emp-1' } as any);
    vi.mocked(isValidTier).mockReturnValue(true);
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({
      organizationId: 'org-1',
      stripeCustomerId: 'cus_existing',
      contactEmail: 'acme@example.com',
      companyName: 'Acme Inc',
    } as any);

    const mockSession = { url: 'https://checkout.stripe.com/session_123' };
    const stripeMock = {
      customers: { create: vi.fn() },
      checkout: { sessions: { create: vi.fn().mockResolvedValue(mockSession) } },
    };
    vi.mocked(getStripe).mockReturnValue(stripeMock as any);

    const res = await checkoutPOST(makeRequest({ tier: 'growth' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://checkout.stripe.com/session_123');

    expect(stripeMock.customers.create).not.toHaveBeenCalled();
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing',
        line_items: [{ price: 'price_growth', quantity: 1 }],
        mode: 'subscription',
        metadata: { employerId: 'emp-1', tier: 'growth', userId: 'user-1' },
      })
    );
  });

  it('creates new Stripe customer when none exists and then checkout session', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: 'emp-1' } as any);
    vi.mocked(isValidTier).mockReturnValue(true);
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({
      organizationId: 'org-1',
      stripeCustomerId: null,
      contactEmail: 'new@example.com',
      companyName: 'NewCo',
    } as any);

    const mockSession = { url: 'https://checkout.stripe.com/session_new' };
    const stripeMock = {
      customers: {
        create: vi.fn().mockResolvedValue({ id: 'cus_new' }),
      },
      checkout: {
        sessions: { create: vi.fn().mockResolvedValue(mockSession) },
      },
    };
    vi.mocked(getStripe).mockReturnValue(stripeMock as any);
    vi.mocked(prisma.employer.update).mockResolvedValue({ id: 'emp-1' } as any);

    const res = await checkoutPOST(makeRequest({ tier: 'enterprise' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://checkout.stripe.com/session_new');

    expect(stripeMock.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        name: 'NewCo',
        metadata: { employerId: 'emp-1', userId: 'user-1' },
      })
    );
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_new',
        line_items: [{ price: 'price_enterprise', quantity: 1 }],
        mode: 'subscription',
      })
    );
    expect(prisma.employer.update).toHaveBeenCalled();
  });

  it.each([
    ['basic', 'price_basic', 19900],
    ['growth', 'price_growth', 49900],
    ['enterprise', 'price_enterprise', 99900],
  ] as const)('selects correct tier config for %s', async (tier, expectedPriceId, expectedAmount) => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: 'emp-1' } as any);
    vi.mocked(isValidTier).mockReturnValue(true);
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({
      organizationId: 'org-1',
      stripeCustomerId: 'cus_123',
      contactEmail: 'test@example.com',
      companyName: 'TestCo',
    } as any);

    const stripeMock = {
      customers: { create: vi.fn() },
      checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/s' }) } },
    };
    vi.mocked(getStripe).mockReturnValue(stripeMock as any);

    const res = await checkoutPOST(makeRequest({ tier }));
    expect(res.status).toBe(200);

    const call = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(call.line_items).toEqual([{ price: expectedPriceId, quantity: 1 }]);
  });

  it('returns 500 on unexpected Stripe error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: 'emp-1' } as any);
    vi.mocked(isValidTier).mockReturnValue(true);
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({
      organizationId: 'org-1',
      stripeCustomerId: 'cus_123',
      contactEmail: 'test@example.com',
      companyName: 'TestCo',
    } as any);
    vi.mocked(getStripe).mockImplementation(() => {
      throw new Error('Stripe down');
    });

    const res = await checkoutPOST(makeRequest({ tier: 'basic' }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});

describe('POST /api/employer/webhook', () => {
  const makeWebhookRequest = (payload: string, signature: string) =>
    new NextRequest('http://localhost:3000/api/employer/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
      body: payload,
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when signature verification fails', async () => {
    const stripeMock = {
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error('invalid signature');
        }),
      },
    };
    vi.mocked(getStripe).mockReturnValue(stripeMock as any);

    const res = await webhookPOST(makeWebhookRequest('{}', 'bad_sig'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Webhook signature verification failed');
  });

  it('updates employer tier on checkout.session.completed', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { employerId: 'emp-1', tier: 'growth' },
          subscription: 'sub_123',
        },
      },
    };
    const stripeMock = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    };
    vi.mocked(getStripe).mockReturnValue(stripeMock as any);
    vi.mocked(prisma.employer.update).mockResolvedValue({ id: 'emp-1' } as any);

    const res = await webhookPOST(makeWebhookRequest(JSON.stringify(event), 'sig_good'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    expect(prisma.employer.update).toHaveBeenCalledWith({
      where: { id: 'emp-1' },
      data: {
        tier: 'growth',
        stripeSubscriptionId: 'sub_123',
        stripeSubscriptionStatus: 'active',
      },
    });
  });

  it('ignores checkout.session.completed when metadata is missing', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: {},
          subscription: 'sub_123',
        },
      },
    };
    const stripeMock = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    };
    vi.mocked(getStripe).mockReturnValue(stripeMock as any);

    const res = await webhookPOST(makeWebhookRequest(JSON.stringify(event), 'sig_good'));
    expect(res.status).toBe(200);
    expect(prisma.employer.update).not.toHaveBeenCalled();
  });

  it('updates status to past_due on invoice.payment_failed', async () => {
    const event = {
      type: 'invoice.payment_failed',
      created: 1_750_000_000,
      data: {
        object: {
          subscription: 'sub_123',
        },
      },
    };
    const stripeMock = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    };
    vi.mocked(getStripe).mockReturnValue(stripeMock as any);
    vi.mocked(prisma.employer.updateMany).mockResolvedValue({ count: 1 } as any);

    const res = await webhookPOST(makeWebhookRequest(JSON.stringify(event), 'sig_good'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    // The webhook now carries an event-ordering guard: stale (older-created)
    // events must not clobber newer subscription state.
    expect(prisma.employer.updateMany).toHaveBeenCalledWith({
      where: {
        stripeSubscriptionId: 'sub_123',
        OR: [
          { stripeSubscriptionEventAt: null },
          { stripeSubscriptionEventAt: { lte: 1_750_000_000 } },
        ],
      },
      data: { stripeSubscriptionStatus: 'past_due', stripeSubscriptionEventAt: 1_750_000_000 },
    });
  });

  it('returns 500 on unexpected webhook processing error', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { employerId: 'emp-1', tier: 'growth' },
          subscription: 'sub_123',
        },
      },
    };
    const stripeMock = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    };
    vi.mocked(getStripe).mockReturnValue(stripeMock as any);
    vi.mocked(prisma.employer.update).mockRejectedValue(new Error('DB down'));

    const res = await webhookPOST(makeWebhookRequest(JSON.stringify(event), 'sig_good'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Webhook processing failed' });
  });
});
