'use client';

import WorkspaceShell from './WorkspaceShell';
import AdminFooter from '@/components/admin/AdminFooter';
import { ADMIN_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';

export default function AdminPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceShell
      portalRole="admin"
      navItems={ADMIN_PORTAL_NAV_ITEMS}
      workspaceLabel={PRODUCT_COPY.adminWorkspace}
      contextLabel="Administrator"
      footer={<AdminFooter />}
    >
      {children}
    </WorkspaceShell>
  );
}
