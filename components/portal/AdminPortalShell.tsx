'use client';

import { useMemo } from 'react';
import WorkspaceShell from './WorkspaceShell';
import AdminFooter from '@/components/admin/AdminFooter';
import { ADMIN_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';
import type { PortalSwitcherRole } from '@/lib/auth/portalRoleSwitcher';

export default function AdminPortalShell({
  children,
  superAdmin = false,
  portalRoles,
}: {
  children: React.ReactNode;
  superAdmin?: boolean;
  portalRoles?: PortalSwitcherRole[];
}) {
  const navItems = useMemo(
    () => ADMIN_PORTAL_NAV_ITEMS.filter((item) => !item.requiresSuperAdminContext || superAdmin),
    [superAdmin]
  );

  return (
    <WorkspaceShell
      portalRole="admin"
      navItems={navItems}
      workspaceLabel={PRODUCT_COPY.adminWorkspace}
      contextLabel="Administrator"
      superAdmin={superAdmin}
      portalRoles={portalRoles}
      footer={<AdminFooter />}
    >
      {children}
    </WorkspaceShell>
  );
}
