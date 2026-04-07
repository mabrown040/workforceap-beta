'use client';

import WorkspaceShell from './WorkspaceShell';
import DashboardFooter from './DashboardFooter';
import DashboardPageErrorBoundary from './DashboardPageErrorBoundary';
import { MEMBER_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';

export default function MemberWorkspaceShell({
  hasResume = true,
  children,
}: {
  /** Member has an original or enhanced resume on file */
  hasResume?: boolean;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceShell
      portalRole="member"
      navItems={MEMBER_PORTAL_NAV_ITEMS}
      workspaceLabel={PRODUCT_COPY.memberWorkspace}
      contextLabel="My account"
      marketingSiteHref="https://www.workforceap.org/"
      marketingSiteLabel="WorkforceAP.org"
      showResumeUploadHint={hasResume === false}
      footer={<DashboardFooter />}
    >
      <DashboardPageErrorBoundary>{children}</DashboardPageErrorBoundary>
    </WorkspaceShell>
  );
}
