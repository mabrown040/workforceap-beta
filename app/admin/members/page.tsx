import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Merge } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { calculateFitScore } from '@/lib/admin/fitScore';
import { calculateHealthStatus } from '@/lib/admin/healthScore';
import MembersTable from '@/components/admin/MembersTable';
import MembersListNav from '@/components/admin/MembersListNav';
import AdminDataLoadError from '@/components/admin/AdminDataLoadError';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { getTranslations } from 'next-intl/server';
import { MEMBER_OR_DOGFOOD_WHERE } from '@/lib/admin/memberOnlyWhere';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return buildPageMetadataAsync({
    title: t('adminMembers'),
    description: t('memberListAndManagement'),
    path: '/admin/members',
  });
}

export default async function AdminMembersPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const t = await getTranslations('admin');

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
      where: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE },
      orderBy: { createdAt: 'desc' },
      take: 2000,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        enrolledProgram: true,
        enrolledAt: true,
        staleTrainingDetectedAt: true,
        assessmentScorePct: true,
        assessmentCompleted: true,
        programInterest: true,
        updatedAt: true,
        createdAt: true,
        // Multi-program-aware: pull every program slug the member has an
        // enrollment row for so the MembersTable filter dropdown can include
        // ALL programs each member is in (not just the denormalized primary
        // on `enrolledProgram`) and so filtering by program matches
        // secondary-enrolled members too.
        courseEnrollments: {
          select: { programSlug: true, isPrimary: true },
        },
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
    // Canonical completed-course count from `course_progress` (includes CSV-promoted Coursera rows).
    prisma.courseProgress.groupBy({
      by: ['userId'],
      where: { status: 'COMPLETED' },
      _count: { _all: true },
    }),
    prisma.memberProgramProgress.findMany({
      take: 5000,
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
        <AdminDataLoadError title={t('membersListUnavailable')} />
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

    const canonicalCount = canonicalCompletionMap.get(m.id) ?? 0;
    // The table only uses .length when no live rollup exists, so a length-stub list is sufficient.
    const coursesCompletedDisplay = new Array(canonicalCount).fill('') as string[];

    const programTitle = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.title : null;
    const totalCourses = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.courses.length ?? 0 : 0;
    const liveProgress = m.enrolledProgram ? programProgressMap.get(`${m.id}:${m.enrolledProgram}`) ?? null : null;
    const activeCourses = activeCourseCountMap.get(m.id) ?? 0;

    // Multi-program-aware: surface every program slug the learner has an
    // enrollment row for. Falls back to legacy `enrolledProgram` when the
    // member has no `course_enrollments` rows yet (legacy / seeded users).
    const enrollmentProgramSlugs = Array.from(
      new Set<string>([
        ...(m.enrolledProgram ? [m.enrolledProgram] : []),
        ...m.courseEnrollments.map((row) => row.programSlug),
      ]),
    );
    const enrollmentProgramTitleBySlug: Record<string, string> = {};
    for (const slug of enrollmentProgramSlugs) {
      enrollmentProgramTitleBySlug[slug] = getProgramBySlug(slug)?.title ?? slug;
    }

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
      enrollmentProgramSlugs,
      enrollmentProgramTitleBySlug,
    };
  });

  // Sort by most recently active first by default (dad-safe: surfaces who needs follow-up).
  // The client table immediately re-sorts via its `sortKey/sortDir` state on the same key,
  // so this controls the first-paint order and matches the client's initial sort.
  membersWithProgram.sort((a, b) => {
    const ta = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
    const tb = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });

  return (
    <PortalPageFrame>
      <PageHeader
        title={t('members')}
        subtitle={t('viewAndManageAccounts')}
        action={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/admin/members/merge" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Merge size={16} /> Merge</Link>
            <Link href="/admin/members/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Plus size={16} /> {t('addMember')}</Link>
          </div>
        }
      />

      <MembersListNav />

      {members.length >= 2000 && (
        <p style={{ margin: '0 0 0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(173,44,77,0.07)', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--color-accent)' }}>
          {t('showing2000MostRecent')}
        </p>
      )}
      <MembersTable members={membersWithProgram} />
    </PortalPageFrame>
  );
}
