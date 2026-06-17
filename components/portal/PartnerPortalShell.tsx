'use client';

import WorkspaceShell from './WorkspaceShell';
import DashboardFooter from './DashboardFooter';
import { PARTNER_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';
import type { PortalSwitcherRole } from '@/lib/auth/portalRoleSwitcher';

export default function PartnerPortalShell({
  partnerName,
  partnerLogoUrl,
  partnerBrandColor,
  orgPrimaryColor,
  orgAccentColor,
  superAdmin,
  superAdminImpersonating,
  portalRoles,
  children,
}: {
  partnerName: string;
  partnerLogoUrl?: string | null;
  partnerBrandColor?: string | null;
  orgPrimaryColor?: string | null;
  orgAccentColor?: string | null;
  superAdmin?: boolean;
  superAdminImpersonating?: boolean;
  portalRoles?: PortalSwitcherRole[];
  children: React.ReactNode;
}) {
  return (
    <WorkspaceShell
      portalRole="partner"
      navItems={PARTNER_PORTAL_NAV_ITEMS}
      workspaceLabel={PRODUCT_COPY.partnerWorkspace}
      contextLabel={partnerName}
      contextLogoUrl={partnerLogoUrl ?? undefined}
      partnerAccentColor={partnerBrandColor ?? undefined}
      orgPrimaryColor={orgPrimaryColor ?? undefined}
      orgAccentColor={orgAccentColor ?? undefined}
      attributionLabel="Powered by WorkforceAP"
      superAdmin={superAdmin}
      superAdminImpersonating={superAdminImpersonating}
      portalRoles={portalRoles}
      superAdminBackHref={superAdmin ? '/partner' : undefined}
      superAdminBackLabel="Switch partner"
      footer={<DashboardFooter />}
    >
      {children}
    </WorkspaceShell>
  );
}
