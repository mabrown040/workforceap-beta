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
    include: {
      profile: true,
      partnerReferrals: {
        take: 1,
        orderBy: { referredAt: 'desc' },
        include: { partner: { select: { id: true, name: true } } },
      },
    },
  });

  const membersWithProgram = members.map((m) => ({
    ...m,
    programTitle: m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.title : null,
    coursesCompleted: (m.coursesCompleted as string[] | null) ?? [],
    totalCourses: m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.courses.length ?? 0 : 0,
    partnerName: m.partnerReferrals[0]?.partner.name ?? null,
    partnerId: m.partnerReferrals[0]?.partner.id ?? null,
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
