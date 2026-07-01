import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { getProfileRole, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withDbRetry } from '@/lib/db/withDbRetry';
import MemberWorkspaceShell from '@/components/portal/MemberWorkspaceShell';
import { getPortalSwitcherRoles } from '@/lib/auth/portalRoleSwitcher';
import { getTranslations } from 'next-intl/server';

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

  const profileRole = await withDbRetry(() => getProfileRole(user.id)).catch((err) => {
    console.error('[dashboard:layout] profileRole lookup failed; degrading to member', err);
    return 'member';
  });
  if (profileRole === 'admin') {
    redirect('/admin');
  }

  const portalRolesPromise = getPortalSwitcherRoles(user.id);
  const superAdminPromise = isSuperAdmin(user.id);

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

  const [portalRoles, superAdmin] = await Promise.all([portalRolesPromise, superAdminPromise]);

  return <MemberWorkspaceShell hasResume={hasResume} superAdmin={superAdmin} portalRoles={portalRoles}>{children}</MemberWorkspaceShell>;
}
