import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import EmployerWorkQueueClient from '@/components/employer/EmployerWorkQueueClient';
import EmployerWorkflowTimeline from '@/components/employer/EmployerWorkflowTimeline';
import { getEmployerWorkQueueSlices } from '@/lib/employer/workQueue';
import { listEmployerWorkflowEvents } from '@/lib/portal/workflowEvents';

export const metadata: Metadata = buildPageMetadata({
  title: 'Employer work queue',
  description: 'Prioritized hiring actions and SLA-style queues.',
  path: '/employer/work-queue',
});

export default async function EmployerWorkQueuePage({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/work-queue');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const sp = (await searchParams) ?? {};
  const focusRaw = sp.focus;
  const initialFocus =
    focusRaw === 'review' || focusRaw === 'stale' || focusRaw === 'interview' ? focusRaw : 'all';

  const slices = await getEmployerWorkQueueSlices(ctx.employerId);
  const rawEvents = await listEmployerWorkflowEvents(ctx.employerId, 40);

  const events = rawEvents.map((e) => ({
    id: e.id,
    createdAt: e.createdAt.toISOString(),
    kind: e.kind,
    headline: e.headline,
    detail: e.detail,
    actorName: e.actor?.fullName ?? null,
  }));

  const toApp = (a: (typeof slices.needsReviewTodayApps)[0]) => ({
    id: a.id,
    jobId: a.jobId,
    status: a.status,
    appliedAt: a.appliedAt.toISOString(),
    jobTitle: a.job.title,
    studentName: a.student.fullName,
    studentId: a.student.id,
  });

  return (
    <>
    <div className="employer-work-queue-page wa-pb-24 wa-md:wa-pb-0">
      <PageHeader
        title="Work queue"
        subtitle="Needs review today, stale applications, and interview follow-ups — with one-click moves where safe."
      />

      <EmployerWorkQueueClient
        needsReviewTodayApps={slices.needsReviewTodayApps.map(toApp)}
        jobsAwaitingPublish={slices.jobsAwaitingPublish.map((j) => ({
          id: j.id,
          title: j.title,
          status: j.status,
          updatedAt: j.updatedAt.toISOString(),
        }))}
        staleApps={slices.staleApps.map(toApp)}
        interviewPending={slices.interviewPending.map(toApp)}
        initialFocus={initialFocus}
      />

      <EmployerWorkflowTimeline events={events} />
    </div>
    </>
  );
}
