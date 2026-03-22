import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export const metadata: Metadata = buildPageMetadata({
  title: 'Workforce AP Applicants',
  description: 'View applications from WorkforceAP members to your job postings.',
  path: '/employer/applications',
});

type PageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

export default async function EmployerApplicationsPage({ searchParams }: PageProps) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/applications');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const { jobId: rawJobId } = await searchParams;
  const jobId = typeof rawJobId === 'string' && rawJobId.trim() ? rawJobId.trim() : undefined;

  let filterJob: { id: string; title: string } | null = null;
  let filterInvalid = false;

  if (jobId) {
    const job = await prisma.job.findFirst({
      where: { id: jobId, employerId: ctx.employerId },
      select: { id: true, title: true },
    });
    if (job) filterJob = job;
    else filterInvalid = true;
  }

  const applications = await prisma.jobPostingApplication.findMany({
    where: {
      job: {
        employerId: ctx.employerId,
        ...(filterJob ? { id: filterJob.id } : {}),
      },
    },
    orderBy: { appliedAt: 'desc' },
    include: {
      job: { select: { id: true, title: true } },
      student: { select: { id: true, fullName: true, email: true } },
    },
  });

  return (
    <div className="employer-applications-page">
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Workforce AP applicants</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.25rem' }}>
        Members who applied through WorkforceAP to your open roles. Review and follow up here.
      </p>

      {filterJob && (
        <div className="employer-applications-filter-banner" role="status">
          <p>
            <strong>Filtered to one role:</strong> {filterJob.title}
          </p>
          <Link href="/employer/applications" className="btn btn-ghost btn-sm">
            Show all applicants
          </Link>
        </div>
      )}

      {filterInvalid && (
        <div className="employer-applications-filter-banner employer-applications-filter-banner--warning" role="alert">
          <p>That job link is invalid or no longer on your account. Showing all applicants instead.</p>
          <Link href="/employer/applications" className="btn btn-ghost btn-sm">
            Clear filter
          </Link>
        </div>
      )}

      {applications.length === 0 ? (
        <p style={{ color: 'var(--color-gray-500)' }}>
          {filterJob ? 'No applications for this posting yet.' : 'No applications yet.'}
        </p>
      ) : (
        <>
          <div className="employer-applications-table-wrap">
            <table className="admin-table employer-applications-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Job</th>
                  <th>Status</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td data-label="Applicant">
                      <div>
                        <strong>{app.student.fullName}</strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>
                          {app.student.email}
                        </div>
                      </div>
                    </td>
                    <td data-label="Job">
                      <Link href={`/employer/jobs/${app.job.id}`} style={{ color: 'var(--color-accent)' }}>
                        {app.job.title}
                      </Link>
                    </td>
                    <td data-label="Status">{app.status}</td>
                    <td data-label="Applied">{app.appliedAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="employer-applications-card-list" aria-label="Applications">
            {applications.map((app) => (
              <li key={`card-${app.id}`} className="employer-application-card">
                <div className="employer-application-card__header">
                  <strong>{app.student.fullName}</strong>
                  <span className="employer-application-card__status">{app.status}</span>
                </div>
                <p className="employer-application-card__email">{app.student.email}</p>
                <p className="employer-application-card__job">
                  <span className="employer-application-card__meta-label">Role</span>{' '}
                  <Link href={`/employer/jobs/${app.job.id}`}>{app.job.title}</Link>
                </p>
                <p className="employer-application-card__date">
                  <span className="employer-application-card__meta-label">Applied</span>{' '}
                  {app.appliedAt.toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
