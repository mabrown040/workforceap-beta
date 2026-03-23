'use client';

import WorkspaceShell from './WorkspaceShell';
import ProgressBanner from './ProgressBanner';
import DashboardFooter from './DashboardFooter';
import { MEMBER_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';

export default function MemberWorkspaceShell({
  programTitle,
  completedCount,
  totalCount,
  children,
}: {
  programTitle?: string;
  completedCount?: number;
  totalCount?: number;
  children: React.ReactNode;
}) {
  const topBanner =
    programTitle != null && totalCount != null && totalCount > 0 ? (
      <ProgressBanner
        programTitle={programTitle}
        completedCount={completedCount ?? 0}
        totalCount={totalCount}
      />
    ) : null;

  return (
    <WorkspaceShell
      portalRole="member"
      navItems={MEMBER_PORTAL_NAV_ITEMS}
      workspaceLabel={PRODUCT_COPY.memberWorkspace}
      contextLabel="My account"
      topBanner={topBanner}
      footer={<DashboardFooter />}
    >
      {children}
    </WorkspaceShell>
  );
}
