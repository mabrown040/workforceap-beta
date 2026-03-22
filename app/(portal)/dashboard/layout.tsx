import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import DashboardShell from '@/components/portal/DashboardShell';

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
      enrolledProgram: true,
      coursesCompleted: true,
    },
  });

  if (dbUser?.deletedAt) {
    redirect('/login?deleted=1');
  }

  const enrolledProgram = dbUser?.enrolledProgram ?? null;
  const coursesCompleted = (dbUser?.coursesCompleted as string[] | null) ?? [];
  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const totalCourses = program?.courses.length ?? 0;
  const completedCount = program
    ? coursesCompleted.filter((s) => program.courses.some((c) => c.slug === s)).length
    : 0;

  return (
    <DashboardShell
      programTitle={program?.title}
      completedCount={completedCount}
      totalCount={totalCourses}
    >
      {children}
    </DashboardShell>
  );
}
