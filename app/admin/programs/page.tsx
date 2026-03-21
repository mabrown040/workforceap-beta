import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS } from '@/lib/content/programs';

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
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Program Overview</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>Read-only enrollment and progress stats.</p>

      {totalEnrollments === 0 ? (
        <div className="admin-empty-state">
          <h3>No enrollments yet</h3>
          <p>When members choose programs, their enrollment and progress will appear here.</p>
          <Link href="/admin/members" className="btn btn-primary">View Members</Link>
        </div>
      ) : (
      <div style={{ overflowX: 'auto' }}>
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
      )}
    </div>
  );
}
