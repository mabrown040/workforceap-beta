'use client';

import WorkspaceShell from './WorkspaceShell';
import DashboardFooter from './DashboardFooter';
import { EMPLOYER_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';
import type { PortalSwitcherRole } from '@/lib/auth/portalRoleSwitcher';

export default function EmployerPortalShell({
  companyName,
  companyLogoUrl,
  employerTier,
  superAdmin,
  superAdminImpersonating,
  portalRoles,
  readOnlyAudit = false,
  children,
}: {
  companyName: string;
  companyLogoUrl?: string | null;
  employerTier?: string;
  superAdmin?: boolean;
  superAdminImpersonating?: boolean;
  portalRoles?: PortalSwitcherRole[];
  readOnlyAudit?: boolean;
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
      portalRoles={portalRoles}
      readOnlyAudit={readOnlyAudit}
      superAdminBackHref={superAdmin ? '/employer' : undefined}
      superAdminBackLabel="Switch company"
      footer={<DashboardFooter />}
    >
      {children}
    </WorkspaceShell>
  );
}
