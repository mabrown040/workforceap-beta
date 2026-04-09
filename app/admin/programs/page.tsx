import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS } from '@/lib/content/programs';
import PageHeader from '@/components/portal/PageHeader';
import AdminProgramCatalogClient from '@/components/admin/AdminProgramCatalogClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Programs',
  description: 'Program overview and enrollment stats.',
  path: '/admin/programs',
});

export default async function AdminProgramsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/programs');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const enrollments = await prisma.user.findMany({
    where: { deletedAt: null, enrolledProgram: { not: null } },
    select: { enrolledProgram: true, assessmentScorePct: true, coursesCompleted: true },
  });

  const byProgram = new Map<string, { count: number; scores: number[]; completed: number }>();
  for (const e of enrollments) {
    const slug = e.enrolledProgram!;
    const prog = byProgram.get(slug) ?? { count: 0, scores: [], completed: 0 };
    prog.count++;
    if (e.assessmentScorePct != null) prog.scores.push(e.assessmentScorePct);
    const completed = (e.coursesCompleted as string[] | null) ?? [];
    prog.completed += completed.length;
    byProgram.set(slug, prog);
  }

  const totalEnrollments = enrollments.length;

  return (
    <div>
      <PageHeader
        title="Programs"
        subtitle="Manage the program catalog (homepage, enrollment, employer filters). Enrollment stats below."
      />

      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Program catalog</h2>
          <a href="/api/admin/programs/export-twc" className="btn btn-outline btn-sm">
            Export for TX state approval (CSV)
          </a>
        </div>
        <AdminProgramCatalogClient />
      </section>

      <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Enrollment stats</h2>
      {totalEnrollments === 0 ? (
        <div className="admin-empty-state">
          <h3>No enrollments yet</h3>
          <p>When members choose programs, their enrollment and progress will appear here.</p>
          <Link href="/admin/members" className="btn btn-primary">View Members</Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="wa-hidden wa-md:wa-block" style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Enrolled</th>
                  <th>Avg Score %</th>
                  <th>Courses Completed</th>
                </tr>
              </thead>
              <tbody>
                {PROGRAMS.map((p) => {
                  const stats = byProgram.get(p.slug) ?? { count: 0, scores: [], completed: 0 };
                  const avgScore = stats.scores.length > 0
                    ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
                    : '—';
                  return (
                    <tr key={p.slug}>
                      <td>{p.title}</td>
                      <td>{stats.count}</td>
                      <td>{avgScore}</td>
                      <td>{stats.completed}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="wa-md:wa-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {PROGRAMS.map((p) => {
              const stats = byProgram.get(p.slug) ?? { count: 0, scores: [], completed: 0 };
              const avgScore = stats.scores.length > 0
                ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
                : '—';
              return (
                <div
                  key={p.slug}
                  style={{
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.875rem 1rem',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{p.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                    <span>Enrolled: <strong style={{ color: 'var(--color-on-surface)' }}>{stats.count}</strong></span>
                    <span>Avg Score: <strong style={{ color: 'var(--color-on-surface)' }}>{typeof avgScore === 'number' ? `${avgScore}%` : avgScore}</strong></span>
                  </div>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                    Courses Completed: <strong style={{ color: 'var(--color-on-surface)' }}>{stats.completed}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
