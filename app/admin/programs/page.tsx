import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS } from '@/lib/content/programs';
import Footer from '@/components/Footer';

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

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Program Overview</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>Read-only enrollment and progress stats.</p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Program</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Enrolled</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Avg Score %</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Courses Completed</th>
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
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{p.title}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{stats.count}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{avgScore}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{stats.completed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Footer />
    </div>
  );
}
