import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock('@/app/seo', () => ({
  buildPageMetadataAsync: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdmin: vi.fn(),
  isSuperAdmin: vi.fn(),
}));

vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(),
}));

vi.mock('@/lib/tenant/adminPageScope', () => ({
  resolveAdminPageTenant: vi.fn(),
  withAdminPageScope: vi.fn(async (_scope: unknown, fn: (db: unknown) => Promise<unknown>) => {
    const { prisma } = await import('@/lib/db/prisma');
    return fn(prisma);
  }),
  inheritUserOrg: vi.fn(() => ({})),
  inheritMemberOrg: vi.fn(() => ({})),
  inheritLeaderOrg: vi.fn(() => ({})),
  inheritInvitedByOrg: vi.fn(() => ({})),
}));

vi.mock('@/lib/admin/cohortAnalytics', () => ({
  getWeeklyRecapCohortStats: vi.fn(),
  getWeeklyScoreboardStats: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    user: { count: vi.fn() },
    placementRecord: { count: vi.fn() },
    userCertification: { count: vi.fn() },
  },
}));

vi.mock('@/components/portal/PageHeader', () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/portal/ui/DataTable', () => ({
  default: () => <div data-testid="weekly-recap-table" />,
}));

import AdminWeeklyRecapAnalyticsPage from '@/app/admin/weekly-recap/page';
import { getUser } from '@/lib/auth/server';
import { getWeeklyRecapCohortStats } from '@/lib/admin/cohortAnalytics';
import { prisma } from '@/lib/db/prisma';
import { resolveAdminPageTenant } from '@/lib/tenant/adminPageScope';

describe('AdminWeeklyRecapAnalyticsPage authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users before checking roles or loading analytics', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    await expect(AdminWeeklyRecapAnalyticsPage({})).rejects.toThrow(
      'REDIRECT:/login?redirectTo=/admin/weekly-recap',
    );

    expect(resolveAdminPageTenant).not.toHaveBeenCalled();
    expect(getWeeklyRecapCohortStats).not.toHaveBeenCalled();
  });

  it('redirects authenticated non-admins before loading analytics', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(resolveAdminPageTenant).mockResolvedValue({ ok: false });

    await expect(AdminWeeklyRecapAnalyticsPage({})).rejects.toThrow('REDIRECT:/dashboard');

    expect(resolveAdminPageTenant).toHaveBeenCalledWith('user-1');
    expect(getWeeklyRecapCohortStats).not.toHaveBeenCalled();
  });

  it('loads weekly recap analytics for admins', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(resolveAdminPageTenant).mockResolvedValue({
      ok: true,
      orgId: 'org-1',
      superAdmin: true,
    });
    vi.mocked(prisma.user.count).mockResolvedValue(0 as any);
    vi.mocked(prisma.placementRecord.count).mockResolvedValue(0 as any);
    vi.mocked(prisma.userCertification.count).mockResolvedValue(0 as any);

    // Default render is the design-kit recap fed by lean week-over-week counts.
    await expect(AdminWeeklyRecapAnalyticsPage({})).resolves.toBeTruthy();

    expect(prisma.user.count).toHaveBeenCalled();
  });
});
