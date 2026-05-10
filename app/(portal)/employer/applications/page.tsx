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
import { getTranslations } from 'next-intl/server';

const PAGE_SIZE = 25;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('employer');
  return buildPageMetadataAsync({
    title: t('applicantsTitle'),
    description: 'View applications from WorkforceAP members to your job postings.',
    path: '/employer/applications',
  });
}

export default async function EmployerApplicationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/applications');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));

  const t = await getTranslations('employer');

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
        title={`${t('applicantsTitle')} (${totalCount})`}
        subtitle={
          <>
            <span className="wa-block md:wa-hidden">{t('applicantsSubtitleMobile')}</span>
            <span className="wa-hidden md:wa-block">{t('applicantsSubtitleDesktop')}</span>
          </>
        }
        breadcrumbs={[{ label: t('employerPortal'), href: '/employer' }, { label: t('applicantsTitle') }]}
      />
      {/* ── Mobile Applications View (≤640px) ── */}
      <div className="wa-block md:wa-hidden wa-pb-24">
        <MobileApplicationsClient
          initialRows={initialRows}
        />
        <div className="wa-px-4">
          <EmployerApplicationsPager page={page} totalPages={totalPages} />
        </div>
      </div>
      {/* ── Desktop View ── */}
      <div className="wa-hidden md:wa-block">
        <EmployerApplicationsClient initialRows={initialRows} />
        <EmployerApplicationsPager page={page} totalPages={totalPages} />
      </div>
    </PortalPageFrame>
  );
}
