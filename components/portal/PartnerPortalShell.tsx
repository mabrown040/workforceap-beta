'use client';

import WorkspaceShell from './WorkspaceShell';
import { PARTNER_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';

export default function PartnerPortalShell({
  partnerName,
  superAdmin,
  superAdminImpersonating,
  children,
}: {
  partnerName: string;
  superAdmin?: boolean;
  superAdminImpersonating?: boolean;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceShell
      portalRole="partner"
      navItems={PARTNER_PORTAL_NAV_ITEMS}
      workspaceLabel={PRODUCT_COPY.partnerWorkspace}
      contextLabel={partnerName}
      superAdmin={superAdmin}
      superAdminImpersonating={superAdminImpersonating}
      superAdminBackHref={superAdmin ? '/admin/partners' : undefined}
      superAdminBackLabel="Switch partner"
    >
      {children}
    </WorkspaceShell>
  );
}
