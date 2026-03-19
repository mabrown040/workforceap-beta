import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import MembersTable from '@/components/admin/MembersTable';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Members',
  description: 'Member list and management.',
  path: '/admin/members',
});

export default async function AdminMembersPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const members = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { profile: true },
  });

  const membersWithProgram = members.map((m) => ({
    ...m,
    programTitle: m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.title : null,
    coursesCompleted: (m.coursesCompleted as string[] | null) ?? [],
    totalCourses: m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.courses.length ?? 0 : 0,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Members</h1>
          <p style={{ color: 'var(--color-gray-600)' }}>View and manage member accounts.</p>
        </div>
        <a href="/admin/members/new" className="btn btn-primary">
          ➕ Add Member
        </a>
      </div>

      <MembersTable members={membersWithProgram} />
    </div>
  );
}
