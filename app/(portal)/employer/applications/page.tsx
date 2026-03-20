import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export const metadata: Metadata = buildPageMetadata({
  title: 'Applications',
  description: 'View applications to your jobs.',
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
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Applications</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Applications to your job postings.
      </p>

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
