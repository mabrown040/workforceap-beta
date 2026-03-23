'use client';

import WorkspaceShell from './WorkspaceShell';
import { EMPLOYER_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';

export default function EmployerPortalShell({
  companyName,
  superAdmin,
  children,
}: {
  companyName: string;
  superAdmin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceShell
      portalRole="employer"
      navItems={EMPLOYER_PORTAL_NAV_ITEMS}
      workspaceLabel={PRODUCT_COPY.employerWorkspace}
      contextLabel={companyName}
      superAdmin={superAdmin}
      superAdminBackHref={superAdmin ? '/admin/employers' : undefined}
      superAdminBackLabel="Switch company"
    >
      {children}
    </WorkspaceShell>
  );
}
