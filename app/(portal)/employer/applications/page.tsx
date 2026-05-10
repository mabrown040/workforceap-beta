import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import { prisma } from '@/lib/db/prisma';
import EmployerApplicationsClient from '@/components/employer/EmployerApplicationsClient';
import EmployerApplicationsPager from '@/components/employer/EmployerApplicationsPager';
import MobileApplicationsClient from '@/components/employer/MobileApplicationsClient';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import {
  parseEmployerApplicationStatusFilter,
  parseEmployerApplicationsSort,
} from '@/lib/employer/employerApplicationsListQuery';

const PAGE_SIZE = 25;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Applicants',
  description: 'View applications from WorkforceAP members to your job postings.',
  path: '/employer/applications',
});
}

export default async function EmployerApplicationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; status?: string; sort?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/applications');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));

  const sp = (await searchParams) ?? {};
  const page = Math.max(1, parseInt(String(sp.page ?? '1'), 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const statusFilter = parseEmployerApplicationStatusFilter(sp.status ?? undefined);
  const sortOrder = parseEmployerApplicationsSort(sp.sort ?? undefined);

  const whereEmployer = {
    job: { employerId: ctx.employerId },
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [applications, totalCount] = await Promise.all([
    prisma.jobPostingApplication.findMany({
      where: whereEmployer,
      orderBy: { appliedAt: sortOrder === 'applied_asc' ? 'asc' : 'desc' },
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
        title={statusFilter ? `Applicants — filtered (${totalCount})` : `Applicants (${totalCount})`}
        subtitle={
          <>
            <span className="wa-block md:wa-hidden">Review candidates and update their status.</span>
            <span className="wa-hidden md:wa-block">Review candidates and update their status as you move them through your hiring process.</span>
          </>
        }
        breadcrumbs={[{ label: 'Employer Portal', href: '/employer' }, { label: 'Applicants' }]}
      />
      {/* ── Mobile Applications View (≤640px) ── */}
      <div className="wa-block md:wa-hidden wa-pb-24">
        <MobileApplicationsClient initialRows={initialRows} />
        <div className="wa-px-4">
          <EmployerApplicationsPager page={page} totalPages={totalPages} status={statusFilter} sort={sortOrder} />
        </div>
      </div>
      {/* ── Desktop View ── */}
      <div className="wa-hidden md:wa-block">
        <EmployerApplicationsClient
          initialRows={initialRows}
          activeStatusFilter={statusFilter}
          activeSort={sortOrder}
        />
        <EmployerApplicationsPager page={page} totalPages={totalPages} status={statusFilter} sort={sortOrder} />
      </div>
    </PortalPageFrame>
  );
}
