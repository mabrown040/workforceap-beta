import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import DashboardSidebar from '@/components/portal/DashboardSidebar';
import ProgressBanner from '@/components/portal/ProgressBanner';
import { SignOutButton } from '@/components/portal/SignOutButton';
import DevViewToggle from '@/components/portal/DevViewToggle';

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
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          borderBottom: '1px solid var(--color-border, #e5e5e5)',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'white',
        }}
      >
        <Link href="/dashboard" style={{ fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none', color: 'inherit' }}>
          WorkforceAP
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <DevViewToggle />
          <SignOutButton />
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        <DashboardSidebar />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {enrolledProgram && program && (
            <ProgressBanner
              programTitle={program.title}
              completedCount={completedCount}
              totalCount={totalCourses}
            />
          )}
          <div style={{ padding: '1.5rem 2rem', flex: 1 }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
