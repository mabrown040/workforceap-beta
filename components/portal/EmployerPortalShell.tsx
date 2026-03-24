'use client';

import WorkspaceShell from './WorkspaceShell';
import { EMPLOYER_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';

export default function EmployerPortalShell({
  companyName,
  companyLogoUrl,
  employerTier,
  superAdmin,
  superAdminImpersonating,
  children,
}: {
  companyName: string;
  companyLogoUrl?: string | null;
  employerTier?: string;
  superAdmin?: boolean;
  superAdminImpersonating?: boolean;
  children: React.ReactNode;
}) {
  const headerBadge = employerTier === 'partner' ? 'Hiring Partner' : undefined;
  return (
    <WorkspaceShell
      portalRole="employer"
      navItems={EMPLOYER_PORTAL_NAV_ITEMS}
      workspaceLabel={PRODUCT_COPY.employerWorkspace}
      contextLabel={companyName}
      contextLogoUrl={companyLogoUrl}
      headerBadge={headerBadge}
      superAdmin={superAdmin}
      superAdminImpersonating={superAdminImpersonating}
      superAdminBackHref={superAdmin ? '/admin/employers' : undefined}
      superAdminBackLabel="Switch company"
    >
      {children}
    </WorkspaceShell>
  );
}
