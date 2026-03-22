'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import DashboardFooter from './DashboardFooter';
import ProgressBanner from './ProgressBanner';
import PortalHeaderActions from './PortalHeaderActions';

type DashboardShellProps = {
  children: React.ReactNode;
  programTitle?: string;
  completedCount?: number;
  totalCount?: number;
};

export default function DashboardShell({
  children,
  programTitle,
  completedCount = 0,
  totalCount = 0,
}: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const closeDrawer = () => setDrawerOpen(false);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.inert = drawerOpen;
    return () => {
      el.inert = false;
    };
  }, [drawerOpen]);

  return (
    <div className="portal-shell-root">
      <header className="portal-shell-header">
        <div className="portal-shell-header__brand">
          <button
            type="button"
            className="dashboard-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={2} aria-hidden />
          </button>
          <Link href="/dashboard" className="portal-shell-header__title-link">
            WorkforceAP
          </Link>
        </div>
        <PortalHeaderActions />
      </header>

      <div
        className={`dashboard-drawer-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={closeDrawer}
        onKeyDown={(e) => e.key === 'Escape' && closeDrawer()}
        role="button"
        tabIndex={-1}
        aria-hidden
      />

      <div className="portal-shell-body-row">
        <DashboardSidebar open={drawerOpen} onClose={closeDrawer} />
        <main ref={mainRef} className="portal-shell-main">
          {programTitle && (
            <ProgressBanner
              programTitle={programTitle}
              completedCount={completedCount}
              totalCount={totalCount}
            />
          )}
          <div className="dashboard-main-content portal-shell-main__inner">{children}</div>
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}
