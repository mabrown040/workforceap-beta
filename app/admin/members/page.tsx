import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { calculateFitScore } from '@/lib/admin/fitScore';
import { calculateHealthStatus } from '@/lib/admin/healthScore';
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

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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

  // Batch fetch last event dates and recent event counts
  const lastEvents = await prisma.memberEvent.groupBy({
    by: ['userId'],
    _max: { createdAt: true },
  });
  const lastEventMap = new Map(lastEvents.map((e) => [e.userId, e._max.createdAt]));

  const recentEvents = await prisma.memberEvent.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: thirtyDaysAgo } },
    _count: true,
  });
  const recentEventMap = new Map(recentEvents.map((e) => [e.userId, e._count]));

  const membersWithProgram = members.map((m) => {
    const fitScore = calculateFitScore({
      enrolledProgram: m.enrolledProgram,
      programInterest: m.programInterest,
      assessmentScorePct: m.assessmentScorePct,
      profile: m.profile,
      fullName: m.fullName,
      email: m.email,
      phone: m.phone,
    });

    const healthStatus = calculateHealthStatus({
      lastEventAt: lastEventMap.get(m.id) ?? null,
      recentEventCount: recentEventMap.get(m.id) ?? 0,
      enrolledAt: m.enrolledAt,
    });

    return {
      ...m,
      programTitle: m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.title : null,
      coursesCompleted: (m.coursesCompleted as string[] | null) ?? [],
      totalCourses: m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.courses.length ?? 0 : 0,
      partnerName: m.partnerReferrals[0]?.partner.name ?? null,
      partnerId: m.partnerReferrals[0]?.partner.id ?? null,
      fitScore,
      healthStatus,
    };
  });

  // Sort by fit score descending by default
  membersWithProgram.sort((a, b) => b.fitScore - a.fitScore);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Members</h1>
          <p style={{ color: 'var(--color-gray-600)' }}>View and manage member accounts.</p>
        </div>
        <Link href="/admin/members/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <Plus size={16} /> Add Member
        </Link>
      </div>

      <MembersTable members={membersWithProgram} />
    </div>
  );
}
