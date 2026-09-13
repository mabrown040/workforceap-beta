import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pricingState = vi.hoisted(() => ({ enforced: false }));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('next-intl/server', () => ({ getTranslations: vi.fn(async () => (key: string) => key) }));
vi.mock('@/app/seo', () => ({ buildPageMetadataAsync: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ getEmployerForUser: vi.fn() }));
vi.mock('@/lib/auth/portalGuards', () => ({ unlinkedEmployerHref: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { employer: { findUnique: vi.fn() } } }));
vi.mock('@/lib/stripe/client', () => ({
  get EMPLOYER_PRICING_ENFORCED() {
    return pricingState.enforced;
  },
  EMPLOYER_TIERS: {
    basic: { name: 'Basic', amount: 19900, jobLimit: 1, features: [] },
    growth: { name: 'Growth', amount: 49900, jobLimit: 5, features: [] },
  },
}));
vi.mock('@/components/portal/PageHeader', () => ({ default: () => null }));
vi.mock('@/components/portal/PortalPageFrame', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/app/(portal)/employer/billing/TierCheckoutForm', () => ({
  default: () => <button type="button">Checkout</button>,
}));

import EmployerBillingPage from '@/app/(portal)/employer/billing/page';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

describe('EmployerBillingPage with pricing disabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pricingState.enforced = false;
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: 'emp-1' } as any);
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({
      tier: 'basic', stripeSubscriptionStatus: null, stripeCustomerId: null, _count: { jobs: 0 },
    } as any);
  });

  it('exposes no checkout controls', async () => {
    const page = await EmployerBillingPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(page);
    expect(html).not.toContain('Checkout');
    expect(html).not.toContain('<form');
  });

  it('preserves checkout controls when pricing is enabled', async () => {
    pricingState.enforced = true;

    const page = await EmployerBillingPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Checkout');
  });
});
