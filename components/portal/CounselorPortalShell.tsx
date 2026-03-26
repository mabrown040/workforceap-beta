'use client';

import WorkspaceShell from './WorkspaceShell';
import { COUNSELOR_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';

export default function CounselorPortalShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle: string;
}) {
  return (
    <WorkspaceShell
      portalRole="counselor"
      navItems={COUNSELOR_PORTAL_NAV_ITEMS}
      workspaceLabel={PRODUCT_COPY.counselorWorkspace ?? 'Counselor'}
      contextLabel={subtitle}
    >
      {children}
    </WorkspaceShell>
  );
}
