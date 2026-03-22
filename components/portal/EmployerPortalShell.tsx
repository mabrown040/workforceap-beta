'use client';

import WorkspaceShell from './WorkspaceShell';
import { EMPLOYER_PORTAL_NAV, PRODUCT_COPY } from '@/lib/nav/workspaceCopy';

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
      navLinks={[...EMPLOYER_PORTAL_NAV]}
      workspaceLabel={PRODUCT_COPY.employerWorkspace}
      contextLabel={companyName}
      superAdmin={superAdmin}
      superAdminBackHref="/admin/employers"
      superAdminBackLabel="Back to employers"
    >
      {children}
    </WorkspaceShell>
  );
}
