'use client';

import WorkspaceShell from './WorkspaceShell';
import { GROUP_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';

export default function MyGroupShell({
  groupNames,
  children,
}: {
  groupNames: string;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceShell
      portalRole="group"
      navItems={GROUP_PORTAL_NAV_ITEMS}
      workspaceLabel={PRODUCT_COPY.groupWorkspace}
      contextLabel={groupNames}
    >
      {children}
    </WorkspaceShell>
  );
}
