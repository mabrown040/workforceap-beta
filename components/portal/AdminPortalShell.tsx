'use client';

import { useMemo } from 'react';
import WorkspaceShell from './WorkspaceShell';
import AdminFooter from '@/components/admin/AdminFooter';
import { ADMIN_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';

export default function AdminPortalShell({
  children,
  superAdmin = false,
}: {
  children: React.ReactNode;
  superAdmin?: boolean;
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
      footer={<AdminFooter />}
    >
      {children}
    </WorkspaceShell>
  );
}
