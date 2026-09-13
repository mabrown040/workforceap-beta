import { beforeEach, describe, expect, it, vi } from 'vitest';

const pricingState = vi.hoisted(() => ({ enforced: false }));

vi.mock('next/server', () => ({
  NextRequest: Request,
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      }),
  },
}));
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), set: vi.fn() })) }));
vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: vi.fn((fn: unknown) => fn),
}));
vi.mock('@/lib/db/withDbRetry', () => ({ withDbRetry: vi.fn(async (fn: () => unknown) => fn()) }));
vi.mock('@/lib/auth/server', () => ({
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(),
}));
vi.mock('@/lib/auth/roles', () => ({ getProfileRole: vi.fn() }));
vi.mock('@/lib/stripe/client', () => ({
  get EMPLOYER_PRICING_ENFORCED() { return pricingState.enforced; },
  getStripe: vi.fn(),
}));
vi.mock('@/lib/stripe/customer', () => ({ getStripeCustomer: vi.fn() }));
vi.mock('@/lib/stripe/pricing', () => ({ getStripePriceId: vi.fn(() => 'price_growth') }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    employerSubscription: { findFirst: vi.fn(), create: vi.fn() },
    employer: { findUnique: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('@/lib/stripe/subscriptionPersistence', () => ({
  reconcileEmployerSubscription: vi.fn(async (...args: unknown[]) => {
    const mirror = args[4] as undefined | ((tx: unknown, next: unknown) => Promise<void>);
    if (mirror) {
      const { prisma } = await import('@/lib/db/prisma');
      await mirror(prisma as never, { status: 'active' });
    }
    return 'applied';
  }),
}));
vi.mock('@/lib/stripe/stripeSubscriptionSnapshot', () => ({
  canonicalSubscriptionSnapshot: vi.fn((value: any) => ({
    id: value.id, customerId: value.customer, status: value.status,
    organizationId: value.metadata?.organizationId,
    employerId: value.metadata?.employerId,
    userId: value.metadata?.userId,
  })),
}));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(async () => undefined) }));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn(async () => undefined) }));

import { POST } from '@/app/api/employer/subscribe/route';
import { getUser } from '@/lib/auth/server';
import { getProfileRole } from '@/lib/auth/roles';
import { getStripe } from '@/lib/stripe/client';
import { getStripeCustomer } from '@/lib/stripe/customer';
import { prisma } from '@/lib/db/prisma';
import { reconcileEmployerSubscription } from '@/lib/stripe/subscriptionPersistence';

const request = () => new Request('http://localhost:3000/api/employer/subscribe', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ tier: 'growth' }),
});

describe('POST /api/employer/subscribe pricing gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pricingState.enforced = false;
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1', email: 'employer@example.test', user_metadata: {} } as never);
    vi.mocked(getProfileRole).mockResolvedValue('employer');
  });

  it('fails closed before customer or subscription creation when pricing is disabled', async () => {
    const res = await POST(request() as never);

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Employer pricing is not available' });
    expect(getStripe).not.toHaveBeenCalled();
    expect(getStripeCustomer).not.toHaveBeenCalled();
    expect(prisma.employerSubscription.findFirst).not.toHaveBeenCalled();
  });
  it('routes enabled direct subscription through shared reconciliation and atomic mirror', async () => {
    pricingState.enforced = true;
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({
      id: 'emp-1', organizationId: 'org-1', stripeSubscriptionId: 'sub-old',
      stripeSubscriptionRevision: 3, stripeCustomerId: 'cus-1',
    } as never);
    vi.mocked(prisma.employerSubscription.findFirst).mockResolvedValue(null);
    vi.mocked(getStripeCustomer).mockResolvedValue('cus-1');
    const subscription = {
      id: 'sub-new', customer: 'cus-1', status: 'active', created: 100, current_period_start: 1,
      current_period_end: 2, trial_end: null,
      metadata: { employerId: 'emp-1', userId: 'user-1', organizationId: 'org-1' },
    };
    const stripe = {
      subscriptions: {
        create: vi.fn(async () => subscription),
        retrieve: vi.fn(async () => subscription),
      },
    };
    vi.mocked(getStripe).mockReturnValue(stripe as never);

    const res = await POST(request() as never);

    expect(res.status).toBe(200);
    expect(stripe.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          employerId: 'emp-1',
          organizationId: 'org-1',
          replacesSubscriptionId: 'sub-old',
        }),
      }),
      { idempotencyKey: 'employer-subscribe:emp-1:3:growth' },
    );
    expect(reconcileEmployerSubscription).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ employerId: 'emp-1', userId: 'user-1', customerId: 'cus-1' }),
      expect.objectContaining({
        subscriptionId: 'sub-new', eventCreated: 100, kind: 'direct_subscribe', replacesSubscriptionId: 'sub-old',
      }),
      expect.any(Function),
      expect.any(Function),
    );
    expect(prisma.employerSubscription.create).toHaveBeenCalledTimes(1);
  });

});
