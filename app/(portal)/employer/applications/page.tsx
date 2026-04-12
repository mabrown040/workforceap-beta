import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import { prisma } from '@/lib/db/prisma';
import EmployerApplicationsClient from '@/components/employer/EmployerApplicationsClient';
import EmployerApplicationsPager from '@/components/employer/EmployerApplicationsPager';
import MobileApplicationsClient from '@/components/employer/MobileApplicationsClient';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

const PAGE_SIZE = 25;

export const metadata: Metadata = buildPageMetadata({
  title: 'WorkforceAP Applicants',
  description: 'View applications from WorkforceAP members to your job postings.',
  path: '/employer/applications',
});

export default async function EmployerApplicationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/applications');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const sp = (await searchParams) ?? {};
  const page = Math.max(1, parseInt(String(sp.page ?? '1'), 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const whereEmployer = { job: { employerId: ctx.employerId } };

  const [applications, totalCount] = await Promise.all([
    prisma.jobPostingApplication.findMany({
      where: whereEmployer,
      orderBy: { appliedAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        job: { select: { id: true, title: true } },
        student: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.jobPostingApplication.count({ where: whereEmployer }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const initialRows = applications.map((app) => ({
    id: app.id,
    jobId: app.jobId,
    status: app.status,
    appliedAt: app.appliedAt.toISOString(),
    employerNotes: app.employerNotes ?? null,
    job: app.job,
    student: app.student,
  }));

  return (
    <PortalPageFrame>
      <PageHeader
        title={`Applicants (${totalCount})`}
        subtitle={
          <>
            <span className="wa-block wa-md:wa-hidden">Review candidates and update their status.</span>
            <span className="wa-hidden wa-md:wa-block">Review candidates and update their status as you move them through your hiring process.</span>
          </>
        }
        breadcrumbs={[{ label: 'Employer Portal', href: '/employer' }, { label: 'Applicants' }]}
      />
      {/* ── Mobile Applications View (≤640px) ── */}
      <div className="wa-block wa-md:wa-hidden wa-pb-24">
        <MobileApplicationsClient initialRows={initialRows} />
        <div className="wa-px-4">
          <EmployerApplicationsPager page={page} totalPages={totalPages} />
        </div>
        <MobileBottomNav variant="employer" />
      </div>
      {/* ── Desktop View ── */}
      <div className="wa-hidden wa-md:wa-block">
        <EmployerApplicationsClient initialRows={initialRows} />
        <EmployerApplicationsPager page={page} totalPages={totalPages} />
      </div>
    </PortalPageFrame>
  );
}
