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
    employer: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn() }));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn() }));

import { POST } from '@/app/api/employer/subscribe/route';
import { getUser } from '@/lib/auth/server';
import { getProfileRole } from '@/lib/auth/roles';
import { getStripe } from '@/lib/stripe/client';
import { getStripeCustomer } from '@/lib/stripe/customer';
import { prisma } from '@/lib/db/prisma';

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
});
