import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock('@/lib/auth/server', () => ({
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  getProfileRole: vi.fn(),
  isSuperAdmin: vi.fn(),
}));

vi.mock('@/lib/auth/portalRoleSwitcher', () => ({
  getPortalSwitcherRoles: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/components/portal/MemberWorkspaceShell', () => ({
  default: vi.fn(({ children }) => <div data-testid="member-shell">{children}</div>),
}));

import DashboardLayout from '@/app/(portal)/dashboard/layout';
import { getUser } from '@/lib/auth/server';
import { getProfileRole, isSuperAdmin } from '@/lib/auth/roles';
import { getPortalSwitcherRoles } from '@/lib/auth/portalRoleSwitcher';
import { prisma } from '@/lib/db/prisma';

describe('DashboardLayout portal switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(isSuperAdmin).mockResolvedValue(false);
    vi.mocked(getPortalSwitcherRoles).mockResolvedValue([]);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      deletedAt: null,
      profile: { resumeOriginalPath: null, resumeEnhancedPath: null },
    } as any);
  });

  it('still redirects regular admins to the admin portal', async () => {
    vi.mocked(getProfileRole).mockResolvedValue('admin');

    await expect(DashboardLayout({ children: <div /> })).rejects.toThrow('REDIRECT:/admin');
  });

  it('allows super admins to render the member dashboard for demos', async () => {
    vi.mocked(getProfileRole).mockResolvedValue('super_admin');
    vi.mocked(isSuperAdmin).mockResolvedValue(true);

    await expect(DashboardLayout({ children: <div /> })).resolves.toBeTruthy();

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );
    expect(getPortalSwitcherRoles).toHaveBeenCalledWith('user-1', { superAdmin: true });
    expect(isSuperAdmin).toHaveBeenCalledWith('user-1');
  });

  it('keeps the superadmin switcher when UserRole grants super_admin and profile is member', async () => {
    vi.mocked(getProfileRole).mockResolvedValue('member');
    vi.mocked(isSuperAdmin).mockResolvedValue(true);

    await expect(DashboardLayout({ children: <div /> })).resolves.toBeTruthy();

    expect(getPortalSwitcherRoles).toHaveBeenCalledWith('user-1', { superAdmin: true });
  });
});
