process.env.TZ = 'UTC';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
vi.mock('@/app/seo', () => ({ buildPageMetadataAsync: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ getPartnerForUser: vi.fn() }));
vi.mock('@/lib/auth/portalGuards', () => ({ unlinkedPartnerHref: async () => '/dashboard' }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { partner: { findUnique: vi.fn() } } }));
vi.mock('@/components/portal/PageHeader', () => ({ default: () => null }));
vi.mock('@/components/portal/PortalPageFrame', () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/partner/PartnerNotificationPrefs', () => ({ default: () => null }));
vi.mock('@/components/partner/PartnerContactEditForm', () => ({ default: () => null }));
vi.mock('@/components/portal/kit', () => ({
  DesignSurface: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardHead: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

import PartnerSettingsPage from '@/app/(portal)/partner/settings/page';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const INSTANT = new Date('2026-09-19T02:30:00Z'); // 9:30 PM CDT, Sep 18

describe('PartnerSettingsPage completion dates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'partner-user' } as never);
    vi.mocked(getPartnerForUser).mockResolvedValue({ partnerId: 'partner-1', partner: { organizationId: 'org-1' } } as never);
    vi.mocked(prisma.partner.findUnique).mockResolvedValue({
      name: 'Synthetic Community', slug: 'community-slug', referralCode: 'community-code',
      contactName: null, contactEmail: null, contactPhone: null, organizationType: null, active: true,
      notifyOnEnrollment: true, notifyOnCourse: true, notifyOnCertified: true, notifyOnPlaced: true,
      onboardingCompletedAt: INSTANT, tourCompletedAt: null,
    } as never);
  });

  it('shows onboarding completion on the Central calendar day and a dash when unset', async () => {
    const html = renderToStaticMarkup(await PartnerSettingsPage());
    expect(html).toContain('Sep 18, 2026');
    expect(html).not.toContain('September 19');
    expect(html).toContain('—');
  });
});
