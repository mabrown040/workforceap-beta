import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { ADMIN_SSR_LIST_CAP, isListTruncated, showingFirstLabel } from '@/lib/db/queryCaps';
import PageHeader from '@/components/portal/PageHeader';
import AdminInterviewReadyTable from '@/components/admin/AdminInterviewReadyTable';
import MembersListNav from '@/components/admin/MembersListNav';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Admin – Interview ready',
  description: 'Members who completed pre-screening',
  path: '/admin/members/interview-ready',
});
}

export default async function AdminInterviewReadyPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members/interview-ready');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const interviewWhere = {
    deletedAt: null,
    interviewEligible: true,
    interviewCompletedAt: null,
  };
  const [rows, rowTotal] = await Promise.all([
    prisma.user.findMany({
      take: ADMIN_SSR_LIST_CAP,
      where: interviewWhere,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        assessmentScorePct: true,
        interviewRequestedAt: true,
        preScreeningResponse: {
          select: {
            primaryGoal: true,
            weeklyHours: true,
            barrier: true,
            employmentStatus: true,
          },
        },
      },
    }),
    prisma.user.count({ where: interviewWhere }),
  ]);

  const tableRows = rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    assessmentScorePct: r.assessmentScorePct,
    interviewRequestedAt: r.interviewRequestedAt,
    preScreening: r.preScreeningResponse
      ? {
          primaryGoal: r.preScreeningResponse.primaryGoal,
          weeklyHours: r.preScreeningResponse.weeklyHours,
          barrier: r.preScreeningResponse.barrier,
          employmentStatus: r.preScreeningResponse.employmentStatus,
        }
      : null,
  }));

  return (
    <div>
      <PageHeader
        title="Interview ready"
        subtitle={
          isListTruncated(rows.length, ADMIN_SSR_LIST_CAP, rowTotal)
            ? showingFirstLabel(rows.length, rowTotal, 'interview-ready members')
            : 'Members who completed pre-screening. Work the queue before scheduling calls.'
        }
        breadcrumbs={[
          { label: 'Members', href: '/admin/members' },
          { label: 'Interview ready' },
        ]}
      />
      <MembersListNav />
      <AdminInterviewReadyTable rows={tableRows} />
    </div>
  );
}
