import { cleanup, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceShell from '@/components/portal/WorkspaceShell';
import { MEMBER_PORTAL_NAV_ITEMS, EMPLOYER_PORTAL_NAV_ITEMS, ADMIN_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { getBestActiveHref } from '@/lib/nav/activeRoute';
import { pickAdminClientMessages } from '@/lib/i18n/pickRootClientMessages';
import messages from '@/messages/en.json';
import spanishMessages from '@/messages/es.json';

const location = vi.hoisted(() => ({ pathname: '/dashboard/program', wide: true }));
vi.mock('next/navigation', () => ({ usePathname: () => location.pathname }));
vi.mock('@/components/super-admin-view-switcher', () => ({ default: () => null, useIsSuperAdmin: () => false }));
vi.mock('@/components/portal/PortalHeaderActions', () => ({ default: () => null }));
vi.mock('@/components/portal/PortalRoleSwitcher', () => ({ default: () => null }));
vi.mock('@/components/portal/MemberPortalTopNav', () => ({ default: () => null }));
vi.mock('@/components/portal/GlobalSearch', () => ({ default: () => null }));
vi.mock('@/components/MobileBottomNav', () => ({ default: () => null }));
vi.mock('@/components/portal/LanguageToggle', () => ({ default: () => <span>Language</span> }));
vi.mock('@/components/theme/ThemeSelector', () => ({
  default: () => <div role="radiogroup" aria-label="Appearance">
    <span>Theme preference</span>
    <button type="button" role="radio" aria-checked="false" tabIndex={-1}>Light</button>
    <button type="button" role="radio" aria-checked="true" tabIndex={0}>System</button>
    <button type="button" role="radio" aria-checked="false" tabIndex={-1}>Dark</button>
  </div>,
}));
vi.mock('@/components/portal/UnreviewedLocaleBanner', () => ({ default: () => null }));
vi.mock('@/components/portal/SignOutButton', () => ({
  SignOutButton: ({ className, children }: { className?: string; children?: React.ReactNode }) => (
    <button type="button" className={className}>{children ?? 'Sign out'}</button>
  ),
}));
vi.mock('@/hooks/useWorkspaceMobileScrollChrome', () => ({ useWorkspaceMobileScrollChrome: () => {} }));

beforeEach(() => {
  location.pathname = '/dashboard/program';
  location.wide = true;
  localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: location.wide, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
  vi.stubGlobal('scrollTo', vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function show(role: 'member' | 'employer' = 'member') {
  return render(<NextIntlClientProvider locale="en" messages={messages}>
    <WorkspaceShell portalRole={role}
      navItems={role === 'member' ? MEMBER_PORTAL_NAV_ITEMS : EMPLOYER_PORTAL_NAV_ITEMS}
      workspaceLabel={role === 'member' ? 'Member portal' : 'Employer portal'}
      contextLabel="Account" readOnlyAudit showResumeUploadHint>
      <h1>Training</h1>
    </WorkspaceShell>
  </NextIntlClientProvider>);
}

describe('workspace navigation', () => {
  it('keeps desktop scrolling inside the shell and reserves the remaining width for main content', () => {
    const css = readFileSync(join(process.cwd(), 'css/portal-main-extracted.css'), 'utf8');

    expect(css).toMatch(/@media \(min-width: 769px\)[\s\S]*?\.workspace-shell-root \{[\s\S]*?height: 100dvh;[\s\S]*?overflow: hidden;/);
    expect(css).toMatch(/\.workspace-shell-body \{[\s\S]*?align-items: stretch;[\s\S]*?overflow: hidden;/);
    expect(css).toMatch(/\.workspace-shell-main \{[\s\S]*?flex: 1 1 auto;[\s\S]*?width: auto;[\s\S]*?height: 100%;[\s\S]*?min-height: 0;[\s\S]*?overflow: auto;/);
    expect(css).toMatch(/\.workspace-sidebar \{[\s\S]*?align-self: stretch;[\s\S]*?height: 100%;[\s\S]*?overflow-y: hidden;/);
    expect(css).toMatch(/\.workspace-sidebar-nav \{[\s\S]*?min-height: 0;[\s\S]*?overflow-y: auto;/);
    expect(css).toMatch(/\.workspace-shell-main--stack \{[\s\S]*?min-height: 100%;/);
    expect(css).toMatch(/\.workspace-shell-main--stack > \.workspace-shell-main-inner \{[\s\S]*?flex: 1 0 auto;/);
    expect(css).toMatch(/@media \(max-height: 40rem\)[\s\S]*?\.workspace-shell-root\[data-workspace-role\] \.workspace-sidebar \{[\s\S]*?overflow-y: auto;/);
  });

  it.each(['/dashboard/program', '/en/dashboard/program', '/dashboard/program/start'])('marks only the most specific destination at %s', (pathname) => {
    location.pathname = pathname;
    const { container } = show();
    const active = container.querySelectorAll('.workspace-sidebar [aria-current="page"]');
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveAttribute('href', pathname.endsWith('/start') ? '/dashboard/program/start' : '/dashboard/program');
  });

  it('does not repeat Home as a second current account link', () => {
    location.pathname = '/dashboard';
    const { container } = show();
    expect(container.querySelectorAll('.workspace-sidebar a[href="/dashboard"]')).toHaveLength(1);
    expect(container.querySelectorAll('.workspace-sidebar [aria-current="page"]')).toHaveLength(1);
  });

  it('shows every secondary group so destinations stay visible', () => {
    location.pathname = '/dashboard/assessment';
    const { container } = show();
    const groups = [...container.querySelectorAll('details')];
    expect(groups).toHaveLength(3);
    expect(groups.every((group) => group.open)).toBe(true);
    expect(screen.getByRole('link', { name: 'Training preassessment' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Resume' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'AI Career Tools' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Profile' })).toBeVisible();
    const primaryHrefs = [...container.querySelectorAll('.workspace-sidebar-nav a')]
      .filter((link) => !link.closest('details'))
      .map((link) => link.getAttribute('href'));
    expect(primaryHrefs).toContain('/dashboard/resume');
    expect(primaryHrefs).toContain('/dashboard/ai-tools');
  });

  it('keeps every distinct member destination reachable through the disclosures', () => {
    const { container } = show();
    const actual = [...container.querySelectorAll('.workspace-sidebar-nav a')].map((link) => link.getAttribute('href'));
    expect(new Set(actual)).toEqual(new Set(MEMBER_PORTAL_NAV_ITEMS.map((item) => item.href)));
    expect(actual).toHaveLength(new Set(actual).size);
    expect(container.querySelectorAll('.workspace-sidebar details[open]')).toHaveLength(3);
  });

  it('retains the collapse preference and reveals destinations in the compact rail', async () => {
    const user = userEvent.setup();
    const { container } = show();
    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(container.querySelector('.workspace-sidebar')).toHaveClass('workspace-sidebar--collapsed');
    expect(localStorage.getItem('wa_nav_collapsed_member')).toBe('1');
    expect(container.querySelector('details')).toBeNull();
    expect(screen.queryByText('Theme preference')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(screen.getByText('Theme preference')).toBeInTheDocument();
  });

  it('keeps the resume hint in member content so it cannot push the rail below its viewport', () => {
    const { container } = show();
    const main = container.querySelector('.workspace-shell-main') as HTMLElement;
    expect(within(main).getByRole('link', { name: 'Upload resume' })).toHaveAttribute('href', '/dashboard/resume');
  });

  it('preserves flat staff navigation while fixing its parent highlight', () => {
    location.pathname = '/employer/jobs';
    const { container } = show('employer');
    expect(container.querySelector('details')).toBeNull();
    const active = container.querySelectorAll('.workspace-sidebar [aria-current="page"]');
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveAttribute('href', '/employer/jobs');
  });

  it('keeps preferences reachable by expanding the staff rail without clipped controls', async () => {
    const user = userEvent.setup();
    show('employer');
    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.queryByText('Language')).not.toBeInTheDocument();
    expect(screen.queryByText('Theme preference')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Theme preference')).toBeInTheDocument();
  });

  it('keeps every visible desktop footer control in keyboard order through sign out', async () => {
    const user = userEvent.setup();
    const { container } = show();
    const footer = container.querySelector('.workspace-sidebar-footer');
    expect(footer).not.toBeNull();

    const appearance = within(footer as HTMLElement).getByRole('radiogroup', { name: 'Appearance' });
    const selectedTheme = within(appearance).getByRole('radio', { name: 'System' });
    const signOut = within(footer as HTMLElement).getByRole('button', { name: 'Sign out' });
    expect(selectedTheme).toHaveAttribute('tabindex', '0');

    selectedTheme.focus();
    await user.tab();
    expect(signOut).toHaveFocus();
  });

  it('keeps a closed mobile drawer out of keyboard and screen-reader navigation', async () => {
    location.wide = false;
    const user = userEvent.setup();
    const { container } = show();
    const rail = container.querySelector('.workspace-sidebar');
    expect(rail).toHaveAttribute('inert');
    expect(rail).toHaveAttribute('aria-hidden', 'true');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('dialog', { name: 'Member portal navigation' })).toHaveAttribute('aria-modal', 'true');
    expect(rail).not.toHaveAttribute('inert');
    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(rail).toHaveAttribute('inert');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.keyboard('{Escape}');
    expect(rail).toHaveAttribute('inert');
  });
});

describe('active-route specificity', () => {
  it('ranks the matched alias, not the length of its unrelated canonical href', () => {
    expect(getBestActiveHref('/dashboard/ai-tools/application-tracker/123', [
      { href: '/dashboard/ai-tools' },
      { href: '/applications', aliases: ['/dashboard/ai-tools/application-tracker'] },
    ])).toBe('/applications');
  });
  it('matches full path segments and leaves unrelated routes unselected', () => {
    expect(getBestActiveHref('/dashboard/programming', [{ href: '/dashboard/program' }])).toBeNull();
  });
});

describe('admin workspace with the production translation slice', () => {
  it.each([
    ['/admin', '/admin'],
    ['/en/admin/students', '/admin/students'],
    ['/admin/students/fixture-student', '/admin/students'],
  ])('marks one destination at %s without raw translation keys', (pathname, activeHref) => {
    location.pathname = pathname;
    const onError = vi.fn();
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={pickAdminClientMessages(messages)} onError={onError}>
        <WorkspaceShell portalRole="admin" navItems={ADMIN_PORTAL_NAV_ITEMS}
          workspaceLabel="Admin workspace" contextLabel="Administrator" readOnlyAudit>
          <h1>Admin content</h1>
        </WorkspaceShell>
      </NextIntlClientProvider>,
    );
    expect(onError).not.toHaveBeenCalled();
    expect(container.querySelector('.workspace-shell-tagline')).toHaveTextContent('Admin workspace');
    expect(container).not.toHaveTextContent('workspace.admin');
    const current = container.querySelectorAll('.workspace-sidebar [aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute('href', activeHref);
    expect(container.querySelectorAll('.workspace-sidebar-link.active')).toHaveLength(1);
  });

  it('uses the selected locale for the admin shell labels', () => {
    location.pathname = '/es/admin/students';
    const onError = vi.fn();
    const { container } = render(
      <NextIntlClientProvider locale="es" messages={pickAdminClientMessages(spanishMessages)} onError={onError}>
        <WorkspaceShell portalRole="admin" navItems={ADMIN_PORTAL_NAV_ITEMS}
          workspaceLabel="Admin workspace" contextLabel="Administrator" readOnlyAudit>
          <h1>Admin content</h1>
        </WorkspaceShell>
      </NextIntlClientProvider>,
    );
    expect(onError).not.toHaveBeenCalled();
    expect(container.querySelector('.workspace-shell-tagline')).toHaveTextContent(spanishMessages.workspace.admin);
    expect(container.querySelector('.workspace-sidebar [aria-current="page"]')).toHaveAttribute('href', '/admin/students');
  });
});
