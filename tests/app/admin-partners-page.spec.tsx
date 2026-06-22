import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/app/seo', () => ({
  buildPageMetadataAsync: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdmin: vi.fn(),
  isSuperAdmin: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    partner: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    partnerReferral: {
      groupBy: vi.fn(),
    },
  },
}));

vi.mock('@/components/admin/PartnersTableClient', () => ({
  default: vi.fn(() => null),
}));

vi.mock('@/components/portal/PageHeader', () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

// The default render is now the design-kit directory; stub it so the test
// exercises the page's auth + data-loading path without rendering the kit tree.
vi.mock('@/components/portal/kit/pages/admin-subviews/PartnersDirectoryKit', () => ({
  PartnersDirectoryKit: () => null,
}));

import AdminPartnersPage from '@/app/admin/partners/page';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

describe('AdminPartnersPage authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects authenticated non-admins before loading partner data', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);

    await expect(AdminPartnersPage({})).rejects.toThrow('REDIRECT:/dashboard');

    expect(prisma.partner.findMany).not.toHaveBeenCalled();
    expect(prisma.partnerReferral.groupBy).not.toHaveBeenCalled();
    expect(isSuperAdmin).not.toHaveBeenCalled();
  });

  it('loads partner data for admins', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isSuperAdmin).mockResolvedValue(true);
    vi.mocked(prisma.partner.findMany).mockResolvedValue([]);
    vi.mocked(prisma.partner.count).mockResolvedValue(0);
    vi.mocked(prisma.partnerReferral.groupBy).mockResolvedValue([] as any);

    await expect(AdminPartnersPage({})).resolves.toBeTruthy();

    expect(prisma.partner.findMany).toHaveBeenCalledTimes(1);
  });
});
