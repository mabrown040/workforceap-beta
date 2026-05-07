import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
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

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Admin – Members',
  description: 'Member list and management.',
  path: '/admin/members',
});
}

export default async function AdminMembersPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Run member list and event aggregates in parallel. Full-table `memberEvent` groupBy
  // can time out or fail under load; degrading aggregates must not hide the member list.
  const [
    membersResult,
    lastEventsResult,
    recentEventsResult,
    canonicalCompletionsResult,
    programProgressResult,
    activeCourseProgressResult,
  ] = await Promise.allSettled([
    prisma.user.findMany({
      where: { deletedAt: null, ...MEMBER_ONLY_WHERE },
      orderBy: { createdAt: 'desc' },
      take: 2000,
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
    // Canonical completed-course count from `course_progress` (includes CSV-promoted
    // Coursera rows). Falls back to legacy `User.coursesCompleted` JSON if this fails
    // or the canonical count is lower (preserves history).
    prisma.courseProgress.groupBy({
      by: ['userId'],
      where: { status: 'COMPLETED' },
      _count: { _all: true },
    }),
    prisma.memberProgramProgress.findMany({
      select: {
        userId: true,
        programSlug: true,
        averagePercent: true,
        coursesCompleted: true,
        lastUpdatedAt: true,
      },
    }),
    prisma.courseProgress.groupBy({
      by: ['userId'],
      where: { status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
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

  const canonicalCompletionMap: Map<string, number> = new Map();
  if (canonicalCompletionsResult.status === 'fulfilled') {
    for (const row of canonicalCompletionsResult.value) {
      canonicalCompletionMap.set(row.userId, row._count._all);
    }
  } else {
    console.error('[admin/members] canonical course_progress count failed', canonicalCompletionsResult.reason);
  }

  const programProgressMap: Map<string, { averagePercent: number; coursesCompleted: number; lastUpdatedAt: Date }> = new Map();
  if (programProgressResult.status === 'fulfilled') {
    for (const row of programProgressResult.value) {
      programProgressMap.set(`${row.userId}:${row.programSlug}`, {
        averagePercent: row.averagePercent,
        coursesCompleted: row.coursesCompleted,
        lastUpdatedAt: row.lastUpdatedAt,
      });
    }
  } else {
    console.error('[admin/members] member_program_progress load failed', programProgressResult.reason);
  }

  const activeCourseCountMap: Map<string, number> = new Map();
  if (activeCourseProgressResult.status === 'fulfilled') {
    for (const row of activeCourseProgressResult.value) {
      activeCourseCountMap.set(row.userId, row._count._all);
    }
  } else {
    console.error('[admin/members] active course_progress count failed', activeCourseProgressResult.reason);
  }

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

    const legacyCourses = parseCourseSlugList(m.coursesCompleted);
    const canonicalCount = canonicalCompletionMap.get(m.id) ?? 0;
    // Prefer canonical truth from course_progress when it exceeds the legacy JSON
    // (CSV-promoted rows are not reflected in the legacy field). The display only
    // uses .length, so a length-stub list is sufficient for higher canonical counts.
    const coursesCompletedDisplay =
      canonicalCount > legacyCourses.length
        ? new Array(canonicalCount).fill('') as string[]
        : legacyCourses;

    const programTitle = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.title : null;
    const totalCourses = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.courses.length ?? 0 : 0;
    const liveProgress = m.enrolledProgram ? programProgressMap.get(`${m.id}:${m.enrolledProgram}`) ?? null : null;
    const activeCourses = activeCourseCountMap.get(m.id) ?? 0;

    return {
      ...m,
      programTitle,
      coursesCompleted: coursesCompletedDisplay,
      totalCourses,
      liveTraining: liveProgress
        ? {
            percent: liveProgress.averagePercent,
            coursesCompleted: liveProgress.coursesCompleted,
            coursesActive: activeCourses,
            totalCourses,
            lastUpdatedAt: liveProgress.lastUpdatedAt,
          }
        : null,
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

      {members.length >= 2000 && (
        <p style={{ margin: '0 0 0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(173,44,77,0.07)', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--color-accent)' }}>
          Showing the 2,000 most recent members. Use the CSV export for a full list.
        </p>
      )}
      <MembersTable members={membersWithProgram} />
    </PortalPageFrame>
  );
}
