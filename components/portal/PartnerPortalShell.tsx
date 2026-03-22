'use client';

import WorkspaceShell from './WorkspaceShell';
import { PARTNER_PORTAL_NAV, PRODUCT_COPY } from '@/lib/nav/workspaceCopy';

/**
 * Same light tool-portal chrome as the employer portal (white header, gray page bg),
 * not the dark marketing-style `portal-nav` strip used for legacy member routes.
 */
export default function PartnerPortalShell({
  partnerName,
  children,
}: {
  partnerName: string;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceShell
      navLinks={[...PARTNER_PORTAL_NAV]}
      workspaceLabel={PRODUCT_COPY.partnerWorkspace}
      contextLabel={partnerName}
    >
      {children}
    </WorkspaceShell>
  );
}
