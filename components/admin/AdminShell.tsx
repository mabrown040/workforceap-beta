'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
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
    <div className="portal-shell-root">
      <header className="portal-shell-header">
        <div className="portal-shell-header__brand">
          <button
            type="button"
            className="admin-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={2} aria-hidden />
          </button>
          <Link href="/admin" className="portal-shell-header__title-link">
            WorkforceAP Admin
          </Link>
        </div>
        <PortalHeaderActions />
      </header>

      <div
        className={`admin-drawer-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={closeDrawer}
        onKeyDown={(e) => e.key === 'Escape' && closeDrawer()}
        role="button"
        tabIndex={-1}
        aria-hidden
      />

      <div className="portal-shell-body-row portal-shell-body-row--admin">
        <AdminSidebar open={drawerOpen} onClose={closeDrawer} />
        <main className="admin-main-content portal-shell-main portal-shell-main--admin">{children}</main>
      </div>

      <AdminFooter />
    </div>
  );
}
