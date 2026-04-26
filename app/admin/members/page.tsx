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
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';
import MembersTable from '@/components/admin/MembersTable';
import AdminDataLoadError from '@/components/admin/AdminDataLoadError';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { MEMBER_ONLY_WHERE } from '@/lib/admin/memberOnlyWhere';

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

  // Run member list and event aggregates in parallel. Full-table `memberEvent` groupBy
  // can time out or fail under load; degrading aggregates must not hide the member list.
  const [membersResult, lastEventsResult, recentEventsResult] = await Promise.allSettled([
    prisma.user.findMany({
      where: { deletedAt: null, ...MEMBER_ONLY_WHERE },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        enrolledProgram: true,
        enrolledAt: true,
        assessmentScorePct: true,
        assessmentCompleted: true,
        programInterest: true,
        coursesCompleted: true,
        updatedAt: true,
        createdAt: true,
        profile: {
          select: {
            profilePhone: true,
            profileAddress: true,
            city: true,
            state: true,
            zip: true,
            address: true,
            employmentStatus: true,
            educationLevel: true,
            financialAidInterest: true,
          },
        },
        partnerReferrals: {
          take: 1,
          orderBy: { referredAt: 'desc' },
          select: { partner: { select: { id: true, name: true } } },
        },
      },
    }),
    // PERF: Bound last-event scan to 30 days. Users absent from this map
    // are treated as inactive by calculateHealthStatus (correct behavior).
    prisma.memberEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _max: { createdAt: true },
    }),
    prisma.memberEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    }),
  ]);

  if (membersResult.status === 'rejected') {
    console.error('[admin/members] user list load failed', membersResult.reason);
    return (
      <PortalPageFrame>
        <AdminDataLoadError title="Members list unavailable" />
      </PortalPageFrame>
    );
  }

  const members = membersResult.value;

  const lastEventMap: Map<string, Date | null> = new Map();
  if (lastEventsResult.status === 'fulfilled') {
    for (const row of lastEventsResult.value) {
      lastEventMap.set(row.userId, row._max.createdAt);
    }
  } else {
    console.error('[admin/members] last-event aggregate failed', lastEventsResult.reason);
  }

  const recentEventMap: Map<string, number> = new Map();
  if (recentEventsResult.status === 'fulfilled') {
    for (const row of recentEventsResult.value) {
      recentEventMap.set(row.userId, row._count._all);
    }
  } else {
    console.error('[admin/members] recent-event aggregate failed', recentEventsResult.reason);
  }

  /** Health needs both aggregates; one failure + zeros mislabels members as inactive/at-risk. */
  const eventAggregatesOk =
    lastEventsResult.status === 'fulfilled' && recentEventsResult.status === 'fulfilled';

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

    const healthStatus = eventAggregatesOk
      ? calculateHealthStatus({
          lastEventAt: lastEventMap.get(m.id) ?? null,
          recentEventCount: recentEventMap.get(m.id) ?? 0,
          enrolledAt: m.enrolledAt,
        })
      : undefined;

    return {
      ...m,
      programTitle: m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.title : null,
      coursesCompleted: parseCourseSlugList(m.coursesCompleted),
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
    <PortalPageFrame>
      <PageHeader
        title="Members"
        subtitle="View and manage member accounts."
        action={<Link href="/admin/members/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Plus size={16} /> Add Member</Link>}
      />

      <MembersTable members={membersWithProgram} />
    </PortalPageFrame>
  );
}
