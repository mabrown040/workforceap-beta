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

vi.mock('@/lib/db/prisma', () => {
  const organization = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  return { prisma: { organization } };
});

vi.mock('@/lib/stripe/client', () => ({
  getStripe: vi.fn(),
}));

vi.mock('@/lib/storage/publicAssetUrl', () => ({
  resolveSupabasePublicAssetUrl: vi.fn(
    (_bucket: string, value: string | null | undefined) =>
      value ? `https://cdn.example.com/${value}` : null
  ),
}));

vi.mock('@/lib/tenant/organizationBranding', () => ({
  clearOrganizationBrandingCache: vi.fn(),
}));

// ─── Imports after mocks ───
import { POST as onboardPOST } from '@/app/api/org/onboard/route';
import { GET as settingsGET, PUT as settingsPUT } from '@/app/api/org/[slug]/settings/route';
import { prisma } from '@/lib/db/prisma';
import { getStripe } from '@/lib/stripe/client';
import { clearOrganizationBrandingCache } from '@/lib/tenant/organizationBranding';
import { NextRequest } from 'next/server';

describe('POST /api/org/onboard', () => {
  const makeRequest = (body: Record<string, unknown>) =>
    new NextRequest('http://localhost:3000/api/org/onboard', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('STRIPE_STARTER_PRICE_ID', 'price_starter_123');
    vi.stubEnv('STRIPE_GROWTH_PRICE_ID', 'price_growth_123');
    vi.stubEnv('STRIPE_ENTERPRISE_PRICE_ID', 'price_enterprise_123');
  });

  it('creates an organization with valid data', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.organization.create).mockResolvedValue({
      id: 'org-1',
      name: 'Test Org',
      slug: 'test-org',
      customDomain: null,
      subscriptionTier: 'starter',
      subscriptionStatus: 'pending_payment',
      createdAt: new Date('2026-01-01'),
    } as any);

    const mockSession = { url: 'https://checkout.stripe.com/session_123' };
    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { create: vi.fn().mockResolvedValue(mockSession) } },
    } as any);

    const res = await onboardPOST(makeRequest({
      name: 'Test Org',
      email: 'admin@example.com',
      tier: 'starter',
    }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.org.name).toBe('Test Org');
    expect(body.org.slug).toBe('test-org');
    expect(body.checkoutUrl).toBe('https://checkout.stripe.com/session_123');
    expect(body.portalUrl).toBe('https://test-org.workforceap.org');

    expect(prisma.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Test Org',
          slug: 'test-org',
          subscriptionTier: 'starter',
          subscriptionStatus: 'pending_payment',
        }),
      })
    );
  });

  it('generates a slug from the org name', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.organization.create).mockResolvedValue({
      id: 'org-2',
      name: 'ACME Corp LLC',
      slug: 'acme-corp-llc',
      customDomain: null,
      subscriptionTier: 'starter',
      subscriptionStatus: 'trial',
      createdAt: new Date('2026-01-01'),
    } as any);

    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: null }) } },
    } as any);

    const res = await onboardPOST(makeRequest({
      name: 'ACME Corp LLC!!!',
      email: 'a@example.com',
    }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.org.slug).toBe('acme-corp-llc');
  });

  it('handles duplicate slugs by appending a numeric suffix', async () => {
    let callCount = 0;
    vi.mocked(prisma.organization.findUnique).mockImplementation(({ where }: any) => {
      callCount++;
      if (where.slug === 'test-org') return Promise.resolve({ id: 'existing-1' } as any);
      if (where.slug === 'test-org-1') return Promise.resolve({ id: 'existing-2' } as any);
      return Promise.resolve(null);
    });

    vi.mocked(prisma.organization.create).mockResolvedValue({
      id: 'org-3',
      name: 'Test Org',
      slug: 'test-org-2',
      customDomain: null,
      subscriptionTier: 'starter',
      subscriptionStatus: 'trial',
      createdAt: new Date('2026-01-01'),
    } as any);

    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: null }) } },
    } as any);

    const res = await onboardPOST(makeRequest({
      name: 'Test Org',
      email: 'a@example.com',
    }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.org.slug).toBe('test-org-2');
    expect(callCount).toBeGreaterThanOrEqual(3);
  });

  it('creates a Stripe Checkout session for paid tiers', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.organization.create).mockResolvedValue({
      id: 'org-4',
      name: 'Growth Org',
      slug: 'growth-org',
      customDomain: null,
      subscriptionTier: 'growth',
      subscriptionStatus: 'pending_payment',
      createdAt: new Date('2026-01-01'),
    } as any);

    const mockSession = { url: 'https://checkout.stripe.com/growth_session' };
    const stripeSessionsCreate = vi.fn().mockResolvedValue(mockSession);
    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { create: stripeSessionsCreate } },
    } as any);

    const res = await onboardPOST(makeRequest({
      name: 'Growth Org',
      email: 'growth@example.com',
      tier: 'growth',
    }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.checkoutUrl).toBe('https://checkout.stripe.com/growth_session');

    expect(stripeSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_growth_123', quantity: 1 }],
        customer_email: 'growth@example.com',
        metadata: { orgSlug: 'growth-org', orgName: 'Growth Org' },
      })
    );
  });

  it('skips Stripe checkout when price ID is not configured', async () => {
    vi.unstubAllEnvs();
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.organization.create).mockResolvedValue({
      id: 'org-5',
      name: 'Free Org',
      slug: 'free-org',
      customDomain: null,
      subscriptionTier: 'starter',
      subscriptionStatus: 'trial',
      createdAt: new Date('2026-01-01'),
    } as any);

    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { create: vi.fn() } },
    } as any);

    const res = await onboardPOST(makeRequest({
      name: 'Free Org',
      email: 'free@example.com',
    }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.checkoutUrl).toBeNull();
    expect(body.org.subscriptionStatus).toBe('trial');
  });

  it('returns 409 when custom domain is already claimed', async () => {
    vi.mocked(prisma.organization.findUnique).mockImplementation(({ where }: any) => {
      if (where.customDomain) return Promise.resolve({ id: 'other-org' } as any);
      return Promise.resolve(null);
    });

    const res = await onboardPOST(makeRequest({
      name: 'New Org',
      email: 'new@example.com',
      domain: 'taken.org',
    }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'That custom domain is already in use.' });
    expect(prisma.organization.create).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid body', async () => {
    const res = await onboardPOST(makeRequest({ name: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 400 for invalid email', async () => {
    const res = await onboardPOST(makeRequest({
      name: 'Valid Name',
      email: 'not-an-email',
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid domain format', async () => {
    const res = await onboardPOST(makeRequest({
      name: 'Valid Name',
      email: 'a@example.com',
      domain: 'not_a_domain',
    }));
    expect(res.status).toBe(400);
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(prisma.organization.findUnique).mockRejectedValue(new Error('DB exploded'));

    const res = await onboardPOST(makeRequest({
      name: 'Crash Org',
      email: 'crash@example.com',
    }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});

describe('GET /api/org/[slug]/settings', () => {
  const makeRequest = (slug: string) =>
    new NextRequest(`http://localhost:3000/api/org/${slug}/settings`, {
      method: 'GET',
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns organization settings', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: 'org-1',
      name: 'Test Org',
      slug: 'test-org',
      logo: 'logo.png',
      primaryColor: '#1a5f7a',
      accentColor: '#ff9900',
      customDomain: 'custom.example.com',
      overviewVideoUrl: 'https://youtube.com/watch?v=123',
      subscriptionTier: 'growth',
      subscriptionStatus: 'active',
    } as any);

    const res = await settingsGET(makeRequest('test-org'), { params: Promise.resolve({ slug: 'test-org' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.name).toBe('Test Org');
    expect(body.slug).toBe('test-org');
    expect(body.accentColor).toBe('#ff9900');
    expect(body.customDomain).toBe('custom.example.com');
    expect(body.logo).toBe('https://cdn.example.com/logo.png');
  });

  it('returns 404 when organization is not found', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

    const res = await settingsGET(makeRequest('missing-org'), { params: Promise.resolve({ slug: 'missing-org' }) });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Organization not found' });
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(prisma.organization.findUnique).mockRejectedValue(new Error('DB down'));

    const res = await settingsGET(makeRequest('test-org'), { params: Promise.resolve({ slug: 'test-org' }) });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});

describe('PUT /api/org/[slug]/settings', () => {
  const makeRequest = (slug: string, body: Record<string, unknown>) =>
    new NextRequest(`http://localhost:3000/api/org/${slug}/settings`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates accentColor and customDomain', async () => {
    vi.mocked(prisma.organization.update).mockResolvedValue({
      id: 'org-1',
      name: 'Test Org',
      slug: 'test-org',
      logo: null,
      primaryColor: null,
      accentColor: '#00ff00',
      customDomain: 'new.example.com',
      overviewVideoUrl: null,
    } as any);

    const res = await settingsPUT(makeRequest('test-org', {
      accentColor: '#00ff00',
      customDomain: 'new.example.com',
    }), { params: Promise.resolve({ slug: 'test-org' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accentColor).toBe('#00ff00');
    expect(body.customDomain).toBe('new.example.com');

    expect(prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'test-org' },
        data: expect.objectContaining({
          accentColor: '#00ff00',
          customDomain: 'new.example.com',
        }),
      })
    );
    expect(clearOrganizationBrandingCache).toHaveBeenCalledWith('org-1');
  });

  it('updates name and primaryColor', async () => {
    vi.mocked(prisma.organization.update).mockResolvedValue({
      id: 'org-1',
      name: 'Renamed Org',
      slug: 'test-org',
      logo: null,
      primaryColor: '#123456',
      accentColor: null,
      customDomain: null,
      overviewVideoUrl: null,
    } as any);

    const res = await settingsPUT(makeRequest('test-org', {
      name: 'Renamed Org',
      primaryColor: '#123456',
    }), { params: Promise.resolve({ slug: 'test-org' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Renamed Org');
    expect(body.primaryColor).toBe('#123456');
  });

  it('returns 400 for invalid accentColor', async () => {
    const res = await settingsPUT(makeRequest('test-org', {
      accentColor: 'red',
    }), { params: Promise.resolve({ slug: 'test-org' }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Color must be a 6-digit hex');
  });

  it('returns 400 for invalid primaryColor', async () => {
    const res = await settingsPUT(makeRequest('test-org', {
      primaryColor: '#xyz',
    }), { params: Promise.resolve({ slug: 'test-org' }) });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('Color must be a 6-digit hex');
  });

  it('returns 400 for invalid overviewVideoUrl', async () => {
    const res = await settingsPUT(makeRequest('test-org', {
      overviewVideoUrl: 'not-a-url',
    }), { params: Promise.resolve({ slug: 'test-org' }) });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeDefined();
  });

  it('returns 500 on unexpected update error', async () => {
    vi.mocked(prisma.organization.update).mockRejectedValue(new Error('DB write failed'));

    const res = await settingsPUT(makeRequest('test-org', {
      name: 'Crash',
    }), { params: Promise.resolve({ slug: 'test-org' }) });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
