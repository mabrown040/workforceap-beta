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
    <div className="portal-shell-root" style={{ background: 'var(--color-background-dark, #121416)', color: 'var(--color-on-surface, #e2e2e5)', minHeight: '100vh' }}>
      {/* Glassmorphic top nav */}
      <header
        className="portal-shell-header glass-nav"
        style={{
          position: 'fixed',
          top: 0,
          width: '100%',
          zIndex: 50,
          background: 'var(--glass-bg, rgba(18,20,22,0.8))',
          backdropFilter: 'var(--glass-blur-xl, blur(20px))',
          WebkitBackdropFilter: 'var(--glass-blur-xl, blur(20px))',
          borderBottom: '1px solid rgba(226,226,229,0.1)',
          boxShadow: 'var(--shadow-glass, 0 8px 32px rgba(0,0,0,0.4))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 1.5rem',
          height: '4rem',
        }}
      >
        <div className="portal-shell-header__brand" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            className="dashboard-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ background: 'none', border: 'none', color: 'var(--color-on-surface)', cursor: 'pointer', display: 'block' }}
          >
            <Menu size={22} strokeWidth={2} aria-hidden />
          </button>
          <Link
            href="/dashboard"
            className="portal-shell-header__title-link"
            style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-on-surface)', textDecoration: 'none' }}
          >
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

      <div className="portal-shell-body-row" style={{ display: 'flex', paddingTop: '4rem' }}>
        <DashboardSidebar open={drawerOpen} onClose={closeDrawer} />
        <main
          ref={mainRef}
          className="portal-shell-main"
          style={{ marginLeft: '16rem', flex: 1, padding: '2rem 1.5rem 3rem', minHeight: 'calc(100vh - 4rem)' }}
        >
          {programTitle && (
            <ProgressBanner
              programTitle={programTitle}
              completedCount={completedCount}
              totalCount={totalCount}
            />
          )}
          <div className="dashboard-main-content portal-shell-main__inner" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}
