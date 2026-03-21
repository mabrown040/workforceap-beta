'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminSidebar from './AdminSidebar';
import AdminFooter from './AdminFooter';
import PortalHeaderActions from '@/components/portal/PortalHeaderActions';

type AdminShellProps = {
  children: React.ReactNode;
};

export default function AdminShell({ children }: AdminShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <header className="portal-shell-header">
        <div className="portal-shell-header__brand">
          <button
            type="button"
            className="admin-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <Link href="/admin" style={{ fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none', color: 'inherit' }}>
            WorkforceAP Admin
          </Link>
        </div>
        <PortalHeaderActions />
      </header>

      <div
        className={`admin-drawer-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={closeDrawer}
        role="button"
        tabIndex={-1}
        aria-hidden
      />

      <div style={{ display: 'flex', flex: 1 }}>
        <AdminSidebar open={drawerOpen} onClose={closeDrawer} />
        <main className="admin-main-content" style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>

      <AdminFooter />
    </div>
  );
}
