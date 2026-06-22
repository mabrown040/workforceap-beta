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
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdmin: vi.fn(),
  isSuperAdmin: vi.fn(),
}));

vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(),
}));

vi.mock('@/lib/admin/cohortAnalytics', () => ({
  getWeeklyRecapCohortStats: vi.fn(),
  getWeeklyScoreboardStats: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
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
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getWeeklyRecapCohortStats } from '@/lib/admin/cohortAnalytics';
import { prisma } from '@/lib/db/prisma';

describe('AdminWeeklyRecapAnalyticsPage authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users before checking roles or loading analytics', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    await expect(AdminWeeklyRecapAnalyticsPage({})).rejects.toThrow(
      'REDIRECT:/login?redirectTo=/admin/weekly-recap',
    );

    expect(isAdmin).not.toHaveBeenCalled();
    expect(getWeeklyRecapCohortStats).not.toHaveBeenCalled();
  });

  it('redirects authenticated non-admins before loading analytics', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);

    await expect(AdminWeeklyRecapAnalyticsPage({})).rejects.toThrow('REDIRECT:/dashboard');

    expect(isAdmin).toHaveBeenCalledWith('user-1');
    expect(getWeeklyRecapCohortStats).not.toHaveBeenCalled();
  });

  it('loads weekly recap analytics for admins', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isSuperAdmin).mockResolvedValue(true);
    vi.mocked(prisma.user.count).mockResolvedValue(0 as any);
    vi.mocked(prisma.placementRecord.count).mockResolvedValue(0 as any);
    vi.mocked(prisma.userCertification.count).mockResolvedValue(0 as any);

    // Default render is the design-kit recap fed by lean week-over-week counts.
    await expect(AdminWeeklyRecapAnalyticsPage({})).resolves.toBeTruthy();

    expect(prisma.user.count).toHaveBeenCalled();
  });
});
