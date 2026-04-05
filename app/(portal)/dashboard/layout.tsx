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

  const dbUser = await prisma.user.findUnique({
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
