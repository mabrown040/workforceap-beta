import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ user: vi.fn(), audit: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.user }));
vi.mock('@/app/seo', () => ({ buildPageMetadataAsync: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (href: string) => { throw new Error(`redirect:${href}`); } }));
vi.mock('next/headers', () => ({ headers: async () => ({}) }));
vi.mock('@/lib/audit/readOnlyPortalAudit', () => ({ isReadOnlyPortalAuditHeader: mocks.audit }));
vi.mock('@/app/(portal)/dashboard/points/ReferralShareCard', () => ({ default: () => <section aria-label="Referral sharing toolkit" /> }));
import Page from '@/app/(portal)/dashboard/referrals/page';
import { MEMBER_PORTAL_NAV_ITEMS, ADMIN_PORTAL_NAV_ITEMS, PARTNER_PORTAL_NAV_ITEMS, COUNSELOR_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: 'member-own' }); mocks.audit.mockReturnValue(false); });
describe('dedicated member referral destination', () => {
  it('requires authentication before rendering the toolkit', async () => {
    mocks.user.mockResolvedValue(null);
    await expect(Page()).rejects.toThrow('redirect:/login?redirectTo=/dashboard/referrals');
  });
  it('reuses the sharing toolkit with a clear member page title', async () => {
    render(await Page());
    expect(screen.getByRole('heading', { level: 1, name: 'Invite a friend' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Referral sharing toolkit' })).toBeInTheDocument();
  });
  it('does not mint a referral code during a read-only audit', async () => {
    mocks.audit.mockReturnValue(true); render(await Page());
    expect(screen.queryByRole('region', { name: 'Referral sharing toolkit' })).not.toBeInTheDocument();
    expect(screen.getByText(/Referral link generation is paused/)).toBeInTheDocument();
  });
  it('has one explicit member navigation entry without adding it to staff portals', () => {
    const links = MEMBER_PORTAL_NAV_ITEMS.filter(item => item.href === '/dashboard/referrals');
    expect(links).toHaveLength(1); expect(links[0].label).toBe('Invite a friend');
    expect([...ADMIN_PORTAL_NAV_ITEMS, ...PARTNER_PORTAL_NAV_ITEMS, ...COUNSELOR_PORTAL_NAV_ITEMS].some(item => item.href === '/dashboard/referrals')).toBe(false);
  });
});
