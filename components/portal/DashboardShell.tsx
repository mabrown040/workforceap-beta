'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardSidebar from './DashboardSidebar';
import DashboardFooter from './DashboardFooter';
import ProgressBanner from './ProgressBanner';
import { SignOutButton } from './SignOutButton';
import DevViewToggle from './DevViewToggle';

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

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <header className="portal-shell-header">
        <div className="portal-shell-header__brand">
          <button
            type="button"
            className="dashboard-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <Link href="/dashboard" style={{ fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none', color: 'inherit' }}>
            WorkforceAP
          </Link>
        </div>
        <div className="portal-shell-header__actions">
          <DevViewToggle />
          <SignOutButton className="btn btn-outline btn-sm" />
        </div>
      </header>

      <div
        className={`dashboard-drawer-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={closeDrawer}
        onKeyDown={(e) => e.key === 'Escape' && closeDrawer()}
        role="button"
        tabIndex={-1}
        aria-hidden
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <DashboardSidebar open={drawerOpen} onClose={closeDrawer} />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {programTitle && (
            <ProgressBanner
              programTitle={programTitle}
              completedCount={completedCount}
              totalCount={totalCount}
            />
          )}
          <div style={{ padding: '1.5rem 2rem', flex: 1 }}>{children}</div>
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}
