'use client';

import WorkspaceShell from './WorkspaceShell';
import DashboardFooter from './DashboardFooter';
import { COUNSELOR_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';
import type { PortalSwitcherRole } from '@/lib/auth/portalRoleSwitcher';

export default function CounselorPortalShell({
  children,
  subtitle,
  portalRoles,
}: {
  children: React.ReactNode;
  subtitle: string;
  portalRoles?: PortalSwitcherRole[];
}) {
  return (
    <WorkspaceShell
      portalRole="counselor"
      navItems={COUNSELOR_PORTAL_NAV_ITEMS}
      workspaceLabel={PRODUCT_COPY.counselorWorkspace ?? 'Counselor'}
      contextLabel={subtitle}
      portalRoles={portalRoles}
      footer={<DashboardFooter />}
    >
      {children}
    </WorkspaceShell>
  );
}
