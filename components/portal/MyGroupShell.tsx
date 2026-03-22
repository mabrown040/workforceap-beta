'use client';

import WorkspaceShell from './WorkspaceShell';
import { GROUP_PORTAL_NAV, PRODUCT_COPY } from '@/lib/nav/workspaceCopy';

export default function MyGroupShell({
  groupNames,
  children,
}: {
  groupNames: string;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceShell
      navLinks={[...GROUP_PORTAL_NAV]}
      workspaceLabel={PRODUCT_COPY.groupWorkspace}
      contextLabel={groupNames}
    >
      {children}
    </WorkspaceShell>
  );
}
