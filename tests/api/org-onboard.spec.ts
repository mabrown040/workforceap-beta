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
  return { prisma: { $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }), organization } };
});

vi.mock('@/lib/stripe/client', () => ({
  getStripe: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(async () => ({ id: 'admin-1' })),
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdminInOrg: vi.fn(async () => true),
  isSuperAdmin: vi.fn(async () => true),
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
  // The route was intentionally reduced to invite-only (see the route file):
  // every request gets a 403 with a request-access message. The old
  // self-serve creation flow (slug generation, Stripe checkout, domain
  // claims) no longer exists, so those behaviors are no longer asserted.
  it('returns 403 invite-only for any request', async () => {
    const res = await onboardPOST(
      new Request('http://localhost/api/org/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName: 'Test Org', adminEmail: 'admin@test.org' }),
      }) as never
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(String(data.error)).toContain('invite-only');
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
    // The route now looks up the org (select: { id }) before updating.
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({ id: 'org-1' } as any);
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
