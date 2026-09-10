import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminCommandCenter } from '@/lib/admin/commandCenter';

const mocks = vi.hoisted(() => ({ user: vi.fn(), scope: vi.fn(), load: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock('@/app/seo', () => ({ buildPageMetadataAsync: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.user, withAuthGuc: (fn: () => unknown) => fn() }));
vi.mock('@/lib/tenant/adminPageScope', () => ({ resolveAdminPageTenant: mocks.scope }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: vi.fn() }));
vi.mock('@/lib/admin/commandCenter', () => ({ getAdminCommandCenter: mocks.load }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
vi.mock('@/components/portal/PortalPageFrame', () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/portal/PageHeader', () => ({ default: () => null }));
vi.mock('@/components/portal/kit/pages/admin/CommandCenterKit', () => ({ CommandCenterKit: () => null }));
vi.mock('@/components/admin/AdminDataLoadError', () => ({ default: ({ title }: { title: string }) => <p>{title}</p> }));
vi.mock('@/components/admin/AdminCommandCenterClient', () => ({
  default: ({ data }: { data: AdminCommandCenter }) => <output data-testid="queue-data">{JSON.stringify(data)}</output>,
}));

import AdminCommandCenterPage from '@/app/admin/command-center/page';

function data(total: number, page: number): AdminCommandCenter {
  return {
    needsReply: [], atRisk: [], interviewing: [], applicationsPending: [], programHealth: [],
    pagination: { queue: 'applications', page, pageSize: 25 },
    totals: {
      needsReplyCount: 7, atRiskCount: 9, interviewingCount: 3,
      applicationsPendingCount: total, certificationsPendingCount: 0, oldestPendingApplicationDays: 10,
    },
  };
}
const loadPage = (page: string) => AdminCommandCenterPage({ searchParams: Promise.resolve({ queue: 'applications', page }) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: 'admin-1' });
  mocks.scope.mockResolvedValue({ ok: true, orgId: 'org-1', superAdmin: false });
});

describe('admin command-center page recovery', () => {
  it('redirects a page that disappeared after the last application was reviewed', async () => {
    mocks.load.mockResolvedValue(data(50, 3));
    await expect(loadPage('3')).rejects.toThrow('REDIRECT:/admin/command-center?queue=applications&page=2');
  });

  it('redirects an oversized request to the last actual page', async () => {
    mocks.load.mockResolvedValue(data(51, 100000));
    await expect(loadPage('999999')).rejects.toThrow('REDIRECT:/admin/command-center?queue=applications&page=3');
    expect(mocks.load).toHaveBeenCalledWith('admin-1', expect.objectContaining({ queue: 'applications', page: 100000 }));
  });

  it('returns an empty queue to page1 without deriving its bound from another queue count', async () => {
    mocks.load.mockResolvedValue(data(0, 2));
    await expect(loadPage('2')).rejects.toThrow('REDIRECT:/admin/command-center?queue=applications&page=1');
  });

  it('preserves total count rather than replacing it with the smaller last-page row count', async () => {
    const result = data(51, 3);
    result.applicationsPending = [{ applicationId: 'last-application' }] as AdminCommandCenter['applicationsPending'];
    mocks.load.mockResolvedValue(result);
    render(await loadPage('3'));
    const rendered = JSON.parse(screen.getByTestId('queue-data').textContent!);
    expect(rendered.totals.applicationsPendingCount).toBe(51);
    expect(rendered.applicationsPending).toHaveLength(1);
    expect(rendered.pagination.page).toBe(3);
  });

  it('preserves the admin scope gate before reading queue data', async () => {
    mocks.scope.mockResolvedValue({ ok: false });
    await expect(loadPage('2')).rejects.toThrow('REDIRECT:/dashboard');
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it('shows a load failure rather than rendering an empty or healthy queue', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.load.mockRejectedValue(new Error('Synthetic database failure'));
    render(await loadPage('1'));
    expect(screen.getByText('Command center unavailable')).toBeVisible();
    expect(screen.queryByTestId('queue-data')).not.toBeInTheDocument();
    errorLog.mockRestore();
  });
});
