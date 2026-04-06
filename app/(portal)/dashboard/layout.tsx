import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import MemberWorkspaceShell from '@/components/portal/MemberWorkspaceShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard');

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

  return (
    <MemberWorkspaceShell hasResume={hasResume}>{children}</MemberWorkspaceShell>
  );
}
