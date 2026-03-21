import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Job Applications',
  description: 'View member job applications.',
  path: '/admin/jobs',
});

export default async function AdminJobsPage() {
  let applications: Awaited<ReturnType<typeof fetchApplications>> = [];
  let error: string | null = null;

  try {
    applications = await fetchApplications();
  } catch (e) {
    console.error('Failed to load job applications:', e);
    error = 'Failed to load job applications. Please try again later.';
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Job Applications</h1>
        <p className="admin-subtitle">Track member job applications across all programs.</p>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {!error && applications.length === 0 && (
        <div className="admin-empty-state">
          <p>No job applications found.</p>
        </div>
      )}

      {!error && applications.length > 0 && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th>Applied</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>{app.user?.email ?? 'Unknown'}</td>
                  <td>{app.company ?? '—'}</td>
                  <td>{app.role ?? '—'}</td>
                  <td>
                    <span className={`status-badge status-${(app.status ?? 'SAVED').toLowerCase()}`}>
                      {app.status ?? 'SAVED'}
                    </span>
                  </td>
                  <td>{app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Footer />
    </div>
  );
}

async function fetchApplications() {
  return prisma.jobApplication.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: {
        select: { email: true },
      },
    },
  });
}
