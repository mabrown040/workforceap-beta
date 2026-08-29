import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getUser } from '@/lib/auth/server';
import { getProfileRole, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withDbRetry } from '@/lib/db/withDbRetry';
import MemberWorkspaceShell from '@/components/portal/MemberWorkspaceShell';
import { getPortalSwitcherRoles } from '@/lib/auth/portalRoleSwitcher';
import { getTranslations } from 'next-intl/server';
import { isReadOnlyPortalAuditHeader } from '@/lib/audit/readOnlyPortalAudit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return { title: t('memberDashboard') };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard');
  const readOnlyAudit = isReadOnlyPortalAuditHeader(await headers());
  let memberLayoutLoadFailed = false;

  const [profileRole, superAdmin] = await Promise.all([
    withDbRetry(() => getProfileRole(user.id)).catch((err) => {
      memberLayoutLoadFailed = true;
      console.error('[dashboard:layout] profileRole lookup failed; degrading to member', err);
      return 'member';
    }),
    withDbRetry(() => isSuperAdmin(user.id)).catch((err) => {
      memberLayoutLoadFailed = true;
      console.error('[dashboard:layout] isSuperAdmin lookup failed; treating as not super admin', err);
      return false;
    }),
  ]);
  if (profileRole === 'admin' && !superAdmin) {
    redirect('/admin');
  }

  const portalRolesPromise = getPortalSwitcherRoles(user.id, { superAdmin });

  let dbUser: {
    deletedAt: Date | null;
    profile: { resumeOriginalPath: string | null; resumeEnhancedPath: string | null } | null;
  } | null = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        deletedAt: true,
        profile: {
          select: {
            resumeOriginalPath: true,
            resumeEnhancedPath: true,
          },
        },
      },
    });
  } catch (e) {
    memberLayoutLoadFailed = true;
    console.error('[dashboard layout] profile/resume query failed', e);
    /* Assume resume on file so we do not flash a misleading upload banner when DB is flaky */
    dbUser = { deletedAt: null, profile: null };
  }

  if (dbUser?.deletedAt) {
    redirect('/login?deleted=1');
  }

  const hasResume = !!(
    dbUser?.profile?.resumeOriginalPath || dbUser?.profile?.resumeEnhancedPath
  );

  const portalRoles = await portalRolesPromise;

  return (
    <MemberWorkspaceShell
      hasResume={hasResume}
      superAdmin={superAdmin}
      portalRoles={portalRoles}
      readOnlyAudit={readOnlyAudit}
    >
      {memberLayoutLoadFailed ? <span hidden data-portal-error-state="member-layout-load" /> : null}
      {children}
    </MemberWorkspaceShell>
  );
}
