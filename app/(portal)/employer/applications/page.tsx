import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import { prisma } from '@/lib/db/prisma';
import EmployerApplicationsClient from '@/components/employer/EmployerApplicationsClient';
import MobileApplicationsClient from '@/components/employer/MobileApplicationsClient';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'WorkforceAP Applicants',
  description: 'View applications from WorkforceAP members to your job postings.',
  path: '/employer/applications',
});

export default async function EmployerApplicationsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/applications');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const applications = await prisma.jobPostingApplication.findMany({
    where: { job: { employerId: ctx.employerId } },
    orderBy: { appliedAt: 'desc' },
    include: {
      job: { select: { id: true, title: true } },
      student: { select: { id: true, fullName: true, email: true } },
    },
  });

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
    <div>
      {/* ── Mobile Applications View (≤640px) ── */}
      <div className="wa-block md:wa-hidden wa-pb-24">
        <div className="px-4 pt-6 pb-3">
          <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--color-on-surface)' }}>Applicants</h1>
          <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Review and update candidate status.</p>
        </div>
        <MobileApplicationsClient initialRows={initialRows} />
        <MobileBottomNav variant="portal" />
      </div>
      {/* ── Desktop View ── */}
      <div className="wa-hidden md:wa-block">
        <PageHeader
          title="Applicants"
          subtitle="Update application status as you review candidates. Invalid workflow steps are blocked."
        />
        <EmployerApplicationsClient initialRows={initialRows} />
      </div>
    </div>
  );
}
