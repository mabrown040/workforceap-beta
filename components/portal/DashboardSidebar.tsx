'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { LogOut } from 'lucide-react';
import { SignOutButton } from '@/components/portal/SignOutButton';
import { MEMBER_PORTAL_NAV } from '@/lib/nav/memberPortalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';
import { isActiveRoute } from '@/lib/nav/activeRoute';

type DashboardSidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

const GROUP_LABELS: Record<'core' | 'tools' | 'more', string | null> = {
  core: null,
  tools: 'Tools',
  more: 'More',
};

export default function DashboardSidebar({ open = false, onClose }: DashboardSidebarProps) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const onEscape = useCallback(() => onClose?.(), [onClose]);
  const trapRef = useFocusTrap(open, onEscape);

  return (
    <aside
      ref={trapRef}
      className={`dashboard-sidebar ${open ? 'open' : ''}`}
      style={{
        height: '100vh',
        width: '16rem',
        position: 'fixed',
        left: 0,
        top: 0,
        paddingTop: '5rem',
        background: 'linear-gradient(to right, var(--surface-dim), var(--surface-container-lowest))',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '5rem 1rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        overflowY: 'auto',
      }}
    >
      {/* Sidebar brand */}
      <div style={{ marginBottom: '1.5rem', padding: '0 0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <div style={{ width: '2rem', height: '2rem', borderRadius: 'var(--radius-sm, 4px)', background: 'var(--color-accent, #ad2c4d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-white)', fontSize: '1.125rem' }}>account_balance</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>WorkforceAP</span>
            <span style={{ fontSize: '0.625rem', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>Member Dashboard</span>
          </div>
        </div>
      </div>

      <div className="dashboard-sidebar-inner" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <nav aria-label="Member portal navigation" className="dashboard-sidebar-nav" style={{ flex: 1 }}>
          <ul className="dashboard-sidebar-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            {(['core', 'tools', 'more'] as const).map((group) => (
              <li key={group}>
                {GROUP_LABELS[group] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1.25rem 0.75rem 0.375rem', marginTop: '0.25rem' }}>
                    <span className="dashboard-sidebar-group-label">{GROUP_LABELS[group]}</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                ) : null}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                  {MEMBER_PORTAL_NAV.filter((item) => item.group === group).map(({ href, label, Icon, aliases }) => {
                    const isActive = isActiveRoute(pathname, href, aliases);
                    const Lucide = Icon;
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          className={`dashboard-sidebar-link ${isActive ? 'active' : ''}`}
                          onClick={(e) => {
                            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                            e.preventDefault();
                            void router.push(href);
                            queueMicrotask(() => onClose?.());
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem 0.75rem 0.5rem 1rem',
                            borderRadius: 'var(--radius-lg, 12px)',
                            color: isActive ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                            background: isActive ? 'rgba(173,44,77,0.1)' : 'transparent',
                            textDecoration: 'none',
                            transition: 'all 150ms ease',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.875rem',
                          }}
                        >
                          {Lucide ? (
                            <span className="dashboard-sidebar-icon" aria-hidden="true" style={{ opacity: isActive ? 1 : 0.7 }}>
                              <Lucide size={18} strokeWidth={isActive ? 2.5 : 2} className="text-current" />
                            </span>
                          ) : null}
                          {label}
                          {isActive && (
                            <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <div className="dashboard-sidebar-footer" style={{ marginTop: 'auto', paddingBottom: '2rem', padding: '0 0.5rem' }}>
          <Link
            href="/"
            className="dashboard-sidebar-home-link"
            onClick={() => onClose?.()}
            style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}
          >
            {PRODUCT_COPY.publicSiteLabel}
          </Link>
          <SignOutButton className="dashboard-sidebar-signout" onSignOutStart={onClose}>
            <LogOut size={18} strokeWidth={2} aria-hidden />
            Sign out
          </SignOutButton>
        </div>
      </div>
    </aside>
  );
}
