import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { ADMIN_SSR_LIST_CAP, isListTruncated, showingFirstLabel } from '@/lib/db/queryCaps';
import { MEMBER_OR_DOGFOOD_WHERE } from '@/lib/admin/memberOnlyWhere';
import PageHeader from '@/components/portal/PageHeader';
import AdminJobReadyTable, { type JobReadyRow } from '@/components/admin/AdminJobReadyTable';
import MembersListNav from '@/components/admin/MembersListNav';
import { computeTrainingProgress, JOB_READY_TRAINING_PCT } from '@/lib/member/trainingProgress';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Admin – Job ready',
  description: `Members who have completed ${JOB_READY_TRAINING_PCT}%+ of their training program.`,
  path: '/admin/members/job-ready',
});
}

export default async function AdminJobReadyPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members/job-ready');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const candidateWhere = {
    deletedAt: null,
    ...MEMBER_OR_DOGFOOD_WHERE,
    enrolledProgram: { not: null },
  };
  const [candidates, candidateTotal] = await Promise.all([
    prisma.user.findMany({
      take: ADMIN_SSR_LIST_CAP,
      where: candidateWhere,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        enrolledProgram: true,
        interviewEligible: true,
        memberProgramProgress: {
          select: { programSlug: true, averagePercent: true, coursesCompleted: true },
        },
      },
    }),
    prisma.user.count({ where: candidateWhere }),
  ]);

  const rows: JobReadyRow[] = candidates
    .map((c) => {
      const progress = computeTrainingProgress(c.enrolledProgram, null, c.memberProgramProgress);
      return {
        id: c.id,
        fullName: c.fullName ?? c.email,
        email: c.email,
        phone: c.phone,
        enrolledProgram: c.enrolledProgram,
        trainingPct: progress.pct,
        completedCount: progress.completedCount,
        totalCourses: progress.totalCourses,
        interviewEligible: c.interviewEligible ?? false,
      };
    })
    .filter((r) => r.trainingPct >= JOB_READY_TRAINING_PCT)
    .sort((a, b) => b.trainingPct - a.trainingPct);

  return (
    <div>
      <PageHeader
        title="Job ready"
        subtitle={
          isListTruncated(candidates.length, ADMIN_SSR_LIST_CAP, candidateTotal)
            ? `${showingFirstLabel(candidates.length, candidateTotal, 'enrolled members')} scanned for ${JOB_READY_TRAINING_PCT}%+ completion.`
            : `Members at ${JOB_READY_TRAINING_PCT}%+ training completion. Distinct from Interview ready, which gates on pre-screening for an employer interview.`
        }
        breadcrumbs={[
          { label: 'Members', href: '/admin/members' },
          { label: 'Job ready' },
        ]}
      />
      <MembersListNav />
      <AdminJobReadyTable rows={rows} />
    </div>
  );
}
