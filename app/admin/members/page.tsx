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

  let members;
  const lastEventMap: Map<string, Date | null> = new Map();
  const recentEventMap: Map<string, number> = new Map();

  try {
    members = await prisma.user.findMany({
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

  } catch (e) {
    console.error('[admin/members] load failed', e);
    return (
      <PortalPageFrame>
        <AdminDataLoadError title="Members list unavailable" />
      </PortalPageFrame>
    );
  }

  // Keep the members list usable even if activity rollups fail in some environments.
  try {
    const [lastEvents, recentEvents] = await Promise.all([
      prisma.memberEvent.groupBy({
        by: ['userId'],
        _max: { createdAt: true },
      }),
      prisma.memberEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
    ]);

    for (const e of lastEvents) {
      lastEventMap.set(e.userId, e._max.createdAt);
    }
    for (const e of recentEvents) {
      recentEventMap.set(e.userId, e._count);
    }
  } catch (e) {
    console.error('[admin/members] activity rollup failed; rendering members without health recency data', e);
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

    const healthStatus = calculateHealthStatus({
      lastEventAt: lastEventMap.get(m.id) ?? null,
      recentEventCount: recentEventMap.get(m.id) ?? 0,
      enrolledAt: m.enrolledAt,
    });

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
