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

      {/* Enrollment stats shown FIRST so the stable server-rendered cards are immediately visible */}
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
          <div className="wa-hidden md:wa-block employer-applications-shell" style={{ overflowX: 'auto' }}>
            <table className="admin-table employer-applications-table">
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
                      <td style={{ fontWeight: 600 }}>{p.title}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: stats.count > 0 ? 'var(--color-accent)' : 'var(--color-on-surface-variant)' }}>
                          {stats.count}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: typeof avgScore === 'number' && avgScore >= 70 ? 'var(--color-green, #4a9b4f)' : 'var(--color-on-surface)' }}>
                          {avgScore}{typeof avgScore === 'number' ? '%' : ''}
                        </span>
                      </td>
                      <td>{stats.completed}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — portal-metric style */}
          <div className="md:wa-hidden wa-flex wa-flex-col" style={{ gap: '0.75rem' }}>
            {PROGRAMS.map((p) => {
              const stats = byProgram.get(p.slug) ?? { count: 0, scores: [], completed: 0 };
              const avgScore = stats.scores.length > 0
                ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
                : null;
              const totalCourseSlots = stats.count * (p.courses.length || 1);
              const progressPct = totalCourseSlots > 0 && stats.completed > 0
                ? Math.min(100, Math.round((stats.completed / totalCourseSlots) * 100))
                : 0;
              return (
                <div key={p.slug} className="portal-card portal-card--flat" style={{ padding: '1.125rem' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.875rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.25rem' }}>
                        {p.category ?? 'Program'}
                      </p>
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: 0, lineHeight: 1.3 }}>{p.title}</p>
                    </div>
                    {stats.count > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', background: 'rgba(173,44,77,0.1)', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>school</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-accent)' }}>{stats.count}</span>
                      </div>
                    )}
                  </div>
                  {/* Metric row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem', marginBottom: progressPct > 0 ? '0.875rem' : 0 }}>
                    <div>
                      <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>Enrolled</p>
                      <p style={{ fontSize: '1.25rem', fontWeight: 800, color: stats.count > 0 ? 'var(--color-accent)' : 'var(--color-on-surface-variant)', margin: 0, letterSpacing: '-0.03em' }}>{stats.count}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>Avg Score</p>
                      <p style={{ fontSize: '1.25rem', fontWeight: 800, color: avgScore !== null && avgScore >= 70 ? 'var(--color-green, #4a9b4f)' : 'var(--color-on-surface)', margin: 0, letterSpacing: '-0.03em' }}>
                        {avgScore !== null ? `${avgScore}%` : '—'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>Courses</p>
                      <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-on-surface)', margin: 0, letterSpacing: '-0.03em' }}>{stats.completed}</p>
                    </div>
                  </div>
                  {progressPct > 0 && (
                    <div className="portal-progress-bar portal-progress-bar--thin">
                      <div className="portal-progress-bar__fill" style={{ width: `${progressPct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Program catalog editor — below stats to avoid flash */}
      <section style={{ marginTop: '2.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Program catalog settings</h2>
          <a href="/api/admin/programs/export-twc" className="btn btn-outline btn-sm">
            Export for TX state approval (CSV)
          </a>
        </div>
        <AdminProgramCatalogClient />
      </section>
    </div>
  );
}
