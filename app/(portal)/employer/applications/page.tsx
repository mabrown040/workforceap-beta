import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
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
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import {
  parseEmployerApplicationStatusFilter,
  parseEmployerApplicationsSort,
} from '@/lib/employer/employerApplicationsListQuery';
import { getTranslations } from 'next-intl/server';

const PAGE_SIZE = 25;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('employer');
  return buildPageMetadataAsync({
    title: t('applicants'),
    description: t('reviewCandidateApplications'),
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

  const t = await getTranslations('employer');

  return (
    <PortalPageFrame>
      <PageHeader
        title={statusFilter ? `${t('applicants')} — ${t('filtered')} (${totalCount})` : `${t('applicants')} (${totalCount})`}
        subtitle={
          <>
            <span className="wa-block md:wa-hidden">{t('reviewCandidatesMobile')}</span>
            <span className="wa-hidden md:wa-block">{t('reviewCandidatesDesktop')}</span>
          </>
        }
        breadcrumbs={[{ label: t('employerPortal'), href: '/employer' }, { label: t('applicants') }]}
      />
      {totalCount === 0 && !statusFilter ? (
        // True empty state: no applications at all and no filter applied.
        // (When a filter is active and matches zero rows, fall through to
        // EmployerApplicationsClient so users keep their filter chips and
        // "Show all applicants" reset.)
        <div className="portal-card portal-card--flat" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '1rem' }} aria-hidden="true">inbox</span>
          <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>{t('noApplicationsYet')}</h3>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>{t('postRoleToStartReceiving')}</p>
          <Link href="/employer/jobs/new" style={{ padding: '0.625rem 1.25rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            {t('postAJob')}
          </Link>
        </div>
      ) : (
        <>
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
        </>
      )}
    </PortalPageFrame>
  );
}
