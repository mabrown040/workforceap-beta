import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin - Jobs',
  description: 'Manage employer job postings.',
  path: '/admin/jobs',
});

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  live: 'Live',
  filled: 'Filled',
  closed: 'Closed',
};

export default async function AdminJobsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/jobs');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const jobs = await prisma.job.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      employer: { select: { companyName: true, contactEmail: true } },
      _count: { select: { applications: true } },
    },
  });

  const pendingCount = jobs.filter((j) => j.status === 'pending').length;

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Jobs</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Manage employer job postings. {pendingCount} pending approval.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Company</th>
              <th>Status</th>
              <th>Applications</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>
                  <Link href={`/admin/jobs/${j.id}`} style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                    {j.title}
                  </Link>
                </td>
                <td>{j.employer.companyName}</td>
                <td>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      background:
                        j.status === 'live'
                          ? 'rgba(74, 155, 79, 0.15)'
                          : j.status === 'pending'
                            ? 'rgba(255, 165, 0, 0.15)'
                            : 'var(--color-gray-100)',
                    }}
                  >
                    {STATUS_LABELS[j.status] ?? j.status}
                  </span>
                </td>
                <td>{j._count.applications}</td>
                <td>
                  <Link href={`/admin/jobs/${j.id}`} style={{ marginRight: '0.5rem', fontSize: '0.9rem' }}>
                    Review
                  </Link>
                  <Link href={`/admin/jobs/${j.id}#matches`} style={{ fontSize: '0.9rem' }}>
                    AI Matches
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {jobs.length === 0 && (
        <p style={{ color: 'var(--color-gray-500)', marginTop: '1rem' }}>No jobs yet.</p>
      )}
    </div>
  );
}
