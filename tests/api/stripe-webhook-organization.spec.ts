import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/lib/db/withRequestGuc', () => ({
  withSystemGuc: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

vi.mock('@/lib/webhooks/logEvent', () => ({ logWebhookEvent: vi.fn() }));
vi.mock('@/lib/observability/captureApiError', () => ({ captureApiError: vi.fn() }));

vi.mock('@/lib/db/prisma', () => {
  const organization = { update: vi.fn(), updateMany: vi.fn() };
  return {
    prisma: {
      organization,
      employer: { updateMany: vi.fn() },
      employerSubscription: { updateMany: vi.fn() },
      partner: { updateMany: vi.fn() },
      $transaction: vi.fn(async (arg: unknown) => {
        const { prisma } = await import('@/lib/db/prisma');
        return typeof arg === 'function'
          ? (arg as (tx: typeof prisma) => unknown)(prisma)
          : Promise.all(arg as Promise<unknown>[]);
      }),
    },
  };
});

vi.mock('@/lib/stripe/client', () => ({
  getStripe: vi.fn(),
  getStripeWebhookSecret: vi.fn(() => 'whsec_platform'),
  getStripeConnectWebhookSecret: vi.fn(() => 'whsec_connect'),
}));

import { POST } from '@/app/api/stripe/webhook/route';
import { prisma } from '@/lib/db/prisma';
import { getStripe } from '@/lib/stripe/client';

const request = () =>
  new Request('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig_test' },
    body: '{}',
  });

function deliver(event: Record<string, unknown>) {
  vi.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent: vi.fn(() => event) },
  } as never);
  return POST(request() as never);
}

describe('organization Stripe subscription event ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.organization.updateMany).mockResolvedValue({ count: 1 });
  });

  it('atomically rejects a reordered older event', async () => {
    const res = await deliver({
      id: 'evt_old_failure',
      type: 'invoice.payment_failed',
      created: 100,
      data: {
        object: {
          subscription: 'sub_current',
          metadata: { organizationId: 'org-1' },
        },
      },
    });

    expect(res.status).toBe(200);
    expect(prisma.organization.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'org-1',
        stripeSubscriptionId: 'sub_current',
        OR: [
          { stripeSubscriptionEventAt: null },
          { stripeSubscriptionEventAt: { lt: 100 } },
        ],
      },
      data: {
        subscriptionStatus: 'past_due',
        stripeSubscriptionEventAt: 100,
        stripeSubscriptionEventId: 'evt_old_failure',
      },
    });
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });

  it('makes duplicate events idempotent with strict event-created ordering', async () => {
    await deliver({
      id: 'evt_duplicate',
      type: 'invoice.payment_succeeded',
      created: 200,
      data: {
        object: {
          subscription: 'sub_current',
          metadata: { organizationId: 'org-1' },
        },
      },
    });

    expect(prisma.organization.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          stripeSubscriptionId: 'sub_current',
          OR: [
            { stripeSubscriptionEventAt: null },
            { stripeSubscriptionEventAt: { lt: 200 } },
          ],
        }),
      }),
    );
  });

  it('cannot apply an event for an irrelevant subscription', async () => {
    await deliver({
      id: 'evt_irrelevant',
      type: 'customer.subscription.deleted',
      created: 300,
      data: {
        object: {
          id: 'sub_old',
          metadata: { organizationId: 'org-1' },
        },
      },
    });

    expect(prisma.organization.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'org-1',
          stripeSubscriptionId: 'sub_old',
        }),
        data: expect.objectContaining({
          subscriptionStatus: 'canceled',
          stripeSubscriptionEventAt: 300,
          stripeSubscriptionEventId: 'evt_irrelevant',
        }),
      }),
    );
  });

  it('checkout establishes the authoritative subscription identity only in event order', async () => {
    await deliver({
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      created: 400,
      data: {
        object: {
          payment_status: 'paid',
          subscription: 'sub_new',
          metadata: { organizationId: 'org-1' },
        },
      },
    });

    expect(prisma.organization.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'org-1',
        OR: [
          { stripeSubscriptionEventAt: null },
          { stripeSubscriptionEventAt: { lt: 400 } },
        ],
      },
      data: {
        subscriptionStatus: 'active',
        stripeSubscriptionId: 'sub_new',
        stripeSubscriptionEventAt: 400,
        stripeSubscriptionEventId: 'evt_checkout',
      },
    });
  });
});
