import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/jobs',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import SuperAdminViewSwitcher from '@/components/super-admin-view-switcher';

/**
 * Regression cover for "my super admin switcher isn't there" on the member
 * portal. The shell resolves super-admin from a server prop OR the client
 * /api/auth/me fetch; the degraded case (server prop false because the
 * dashboard layout caught a profile-role error and fell back to 'member')
 * has to still surface the switcher once the fetch answers.
 */
describe('SuperAdminViewSwitcher visibility', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ json: async () => ({ superAdmin: false }) })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders for a super admin viewing the member portal', async () => {
    render(<SuperAdminViewSwitcher initialIsSuperAdmin />);

    expect(screen.getByRole('button', { name: /switch portal view/i })).toBeTruthy();
    // Labels the portal it is currently pointed at, so the demo shows "Member".
    expect(screen.getByText('Member')).toBeTruthy();
  });

  it('still appears when the server prop degraded to false but /api/auth/me reports super admin', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ json: async () => ({ superAdmin: true }) })),
    );

    render(<SuperAdminViewSwitcher initialIsSuperAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /switch portal view/i })).toBeTruthy();
    });
  });

  it('stays hidden for a member who is not a super admin', async () => {
    render(<SuperAdminViewSwitcher initialIsSuperAdmin={false} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    expect(screen.queryByRole('button', { name: /switch portal view/i })).toBeNull();
  });
});
