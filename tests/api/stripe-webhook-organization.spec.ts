import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: Request,
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), { ...init, headers: { 'content-type': 'application/json' } }),
  },
}));
vi.mock('@/lib/db/withRequestGuc', () => ({ withSystemGuc: vi.fn(async (fn: () => Promise<unknown>) => fn()) }));
vi.mock('@/lib/webhooks/logEvent', () => ({ logWebhookEvent: vi.fn() }));
vi.mock('@/lib/observability/captureApiError', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/stripe/subscriptionPersistence', () => ({
  applyOrganizationSubscriptionTransition: vi.fn(async () => 'applied'),
  applyEmployerSubscriptionTransition: vi.fn(async () => 'applied'),
  organizationSubscriptionIsAuthoritative: vi.fn(async () => true),
  userSubscriptionIsAuthoritative: vi.fn(async () => true),
}));
vi.mock('@/lib/db/prisma', () => {
  const employer = { findUnique: vi.fn() };
  const employerSubscription = { updateMany: vi.fn(), count: vi.fn(async () => 1) };
  const tx = { employer, employerSubscription, partner: { updateMany: vi.fn() } };
  return { prisma: { ...tx, $transaction: vi.fn(async (arg: unknown) => typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : Promise.all(arg as Promise<unknown>[])) } };
});
vi.mock('@/lib/stripe/client', () => ({
  getStripe: vi.fn(),
  getStripeWebhookSecret: vi.fn(() => 'whsec_platform'),
  getStripeConnectWebhookSecret: vi.fn(() => 'whsec_connect'),
}));

import { POST } from '@/app/api/stripe/webhook/route';
import { prisma } from '@/lib/db/prisma';
import { getStripe } from '@/lib/stripe/client';
import {
  applyEmployerSubscriptionTransition,
  applyOrganizationSubscriptionTransition,
} from '@/lib/stripe/subscriptionPersistence';

const request = () => new Request('http://localhost/api/stripe/webhook', {
  method: 'POST', headers: { 'stripe-signature': 'sig' }, body: '{}',
});
function deliver(event: Record<string, unknown>, currentSubscription?: Record<string, unknown>) {
  vi.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent: vi.fn(() => event) },
    subscriptions: {
      retrieve: vi.fn(async () => currentSubscription ?? (event.data as { object: Record<string, unknown> }).object),
    },
  } as never);
  return POST(request() as never);
}

describe('Stripe webhook subscription policy wiring', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['invoice.payment_succeeded', 'invoice_succeeded', 'active'],
    ['invoice.payment_failed', 'invoice_failed', 'past_due'],
  ] as const)('routes %s through the organization lifecycle policy', async (type, kind, status) => {
    await deliver({ id: `evt_${kind}`, type, created: 100, data: { object: { subscription: 'sub-1', metadata: { organizationId: 'org-1' } } } });
    expect(applyOrganizationSubscriptionTransition).toHaveBeenCalledWith(expect.anything(), 'org-1', {
      subscriptionId: 'sub-1', status, eventCreated: 100, eventId: `evt_${kind}`,
      kind, bindingAuthorized: false, replacesSubscriptionId: null,
    });
  });

  it.each([
    ['active', 'past_due'],
    ['past_due', 'active'],
  ] as const)('same-second %s delivery reconciles to authoritative %s state', async (deliveredStatus, authoritativeStatus) => {
    await deliver({
      id: `evt_${deliveredStatus}`,
      type: 'customer.subscription.updated',
      created: 100,
      data: { object: { id: 'sub-1', status: deliveredStatus, metadata: { organizationId: 'org-1' } } },
    }, {
      id: 'sub-1', status: authoritativeStatus, metadata: { organizationId: 'org-1' },
    });

    expect(applyOrganizationSubscriptionTransition).toHaveBeenCalledWith(
      expect.anything(),
      'org-1',
      expect.objectContaining({
        subscriptionId: 'sub-1',
        status: authoritativeStatus === 'active' ? 'active' : 'past_due',
        kind: 'subscription_reconciled',
      }),
    );
  });

  it('routes subscription deletion through terminal lifecycle policy', async () => {
    await deliver({ id: 'evt_deleted', type: 'customer.subscription.deleted', created: 101, data: { object: { id: 'sub-1', metadata: { organizationId: 'org-1' } } } });
    expect(applyOrganizationSubscriptionTransition).toHaveBeenCalledWith(expect.anything(), 'org-1', expect.objectContaining({
      subscriptionId: 'sub-1', kind: 'subscription_deleted', status: 'canceled', bindingAuthorized: false,
    }));
  });

  it('allows checkout replacement only with explicit prior binding metadata', async () => {
    await deliver({ id: 'evt_checkout', type: 'checkout.session.completed', created: 102, data: { object: {
      payment_status: 'paid', subscription: 'sub-new', metadata: { organizationId: 'org-1', replacesSubscriptionId: 'sub-old' },
    } } });
    expect(applyOrganizationSubscriptionTransition).toHaveBeenCalledWith(expect.anything(), 'org-1', expect.objectContaining({
      subscriptionId: 'sub-new', kind: 'checkout', bindingAuthorized: true, replacesSubscriptionId: 'sub-old',
    }));
  });

  it('uses the same policy for userId fallback before updating the subscription mirror', async () => {
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({ id: 'emp-1' } as never);
    await deliver({ id: 'evt_user', type: 'customer.subscription.updated', created: 103, data: { object: {
      id: 'sub-1', status: 'active', metadata: { userId: 'user-1' },
    } } });
    expect(applyEmployerSubscriptionTransition).toHaveBeenCalledWith(expect.anything(), 'emp-1', expect.objectContaining({
      subscriptionId: 'sub-1', kind: 'subscription_reconciled', bindingAuthorized: true,
    }));
    expect(prisma.employerSubscription.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', stripeSubscriptionId: 'sub-1' }, data: { status: 'active' },
    });
  });

  it('returns non-2xx when authoritative subscription retrieval fails', async () => {
    vi.mocked(getStripe).mockReturnValue({
      webhooks: { constructEvent: vi.fn(() => ({
        id: 'evt_reconcile_failure',
        type: 'customer.subscription.updated',
        created: 104,
        data: { object: { id: 'sub-1', status: 'active', metadata: { organizationId: 'org-1' } } },
      })) },
      subscriptions: { retrieve: vi.fn(async () => { throw new Error('Stripe unavailable'); }) },
    } as never);

    const res = await POST(request() as never);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Webhook processing failed' });
    expect(applyOrganizationSubscriptionTransition).not.toHaveBeenCalled();
  });

  it('returns non-2xx when persistence contention exhausts retries', async () => {
    vi.mocked(applyOrganizationSubscriptionTransition).mockRejectedValueOnce(
      new Error('Subscription state changed concurrently; retry the Stripe event'),
    );
    const res = await deliver({
      id: 'evt_contended',
      type: 'invoice.payment_failed',
      created: 104,
      data: { object: { subscription: 'sub-1', metadata: { organizationId: 'org-1' } } },
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Webhook processing failed' });
  });

  it('does not update userId mirror when shared policy rejects the event', async () => {
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({ id: 'emp-1' } as never);
    vi.mocked(applyEmployerSubscriptionTransition).mockResolvedValueOnce('ignored');
    await deliver({ id: 'evt_stale', type: 'customer.subscription.updated', created: 99, data: { object: {
      id: 'sub-1', status: 'active', metadata: { userId: 'user-1' },
    } } });
    expect(prisma.employerSubscription.updateMany).not.toHaveBeenCalled();
  });
});
