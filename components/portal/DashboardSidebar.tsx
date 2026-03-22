'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { LogOut } from 'lucide-react';
import { SignOutButton } from '@/components/portal/SignOutButton';
import { MEMBER_PORTAL_NAV } from '@/lib/nav/memberPortalNav';
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
    <aside ref={trapRef} className={`dashboard-sidebar ${open ? 'open' : ''}`}>
      <div className="dashboard-sidebar-inner">
        <nav aria-label="Dashboard navigation" className="dashboard-sidebar-nav">
          <ul className="dashboard-sidebar-list">
            {(['core', 'tools', 'more'] as const).map((group) => (
              <li key={group}>
                {GROUP_LABELS[group] ? <div className="dashboard-sidebar-group-label">{GROUP_LABELS[group]}</div> : null}
                <ul className="dashboard-sidebar-list">
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
                        >
                          {Lucide ? (
                            <span className="dashboard-sidebar-icon">
                              <Lucide size={20} className="text-current" />
                            </span>
                          ) : null}
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
        <div className="dashboard-sidebar-footer">
          <Link href="/" className="dashboard-sidebar-signout" onClick={() => onClose?.()}>
            Site home
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
