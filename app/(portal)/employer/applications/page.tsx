import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import { prisma } from '@/lib/db/prisma';

export const metadata: Metadata = buildPageMetadata({
  title: 'Workforce AP Applicants',
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

  return (
    <div>
      <PageHeader
        title="Workforce AP applicants"
        subtitle="Members who applied through WorkforceAP to your open roles. Review and follow up here."
      />

      {applications.length === 0 ? (
        <p style={{ color: 'var(--color-gray-500)' }}>No applications yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
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
                  <td>
                    <div>
                      <strong>{app.student.fullName}</strong>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>
                        {app.student.email}
                      </div>
                    </div>
                  </td>
                  <td>
                    <Link href={`/employer/jobs/${app.job.id}`} style={{ color: 'var(--color-accent)' }}>
                      {app.job.title}
                    </Link>
                  </td>
                  <td>{app.status}</td>
                  <td>{app.appliedAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
