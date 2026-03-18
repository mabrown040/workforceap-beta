import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin',
  description: 'Admin dashboard.',
  path: '/admin',
});

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const [totalMembers, assessmentsCompleted, recentUsers] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { assessmentCompleted: true, deletedAt: null } }),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        fullName: true,
        email: true,
        enrolledProgram: true,
        enrolledAt: true,
        assessmentScorePct: true,
        assessmentCompleted: true,
        createdAt: true,
      },
    }),
  ]);

  const activeInTraining = await prisma.user.count({
    where: {
      deletedAt: null,
      assessmentCompleted: true,
      enrolledProgram: { not: null },
    },
  });

  const programsCompleted = await prisma.user.count({
    where: {
      deletedAt: null,
      assessmentCompleted: true,
      enrolledProgram: { not: null },
    },
  });

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Admin Overview</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>Manage members and view metrics.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', marginBottom: '0.25rem' }}>Total Members</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalMembers}</div>
        </div>
        <div style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', marginBottom: '0.25rem' }}>Assessments Completed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{assessmentsCompleted}</div>
        </div>
        <div style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', marginBottom: '0.25rem' }}>Active in Training</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{activeInTraining}</div>
        </div>
        <div style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', marginBottom: '0.25rem' }}>Programs Enrolled</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{programsCompleted}</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent signups</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Program</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Enrolled</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Score %</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.map((u) => (
              <tr key={u.id}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                  <Link href={`/admin/members/${u.id}`}>{u.fullName}</Link>
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{u.email}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                  {u.enrolledProgram ? getProgramBySlug(u.enrolledProgram)?.title ?? u.enrolledProgram : '—'}
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{u.enrolledAt?.toLocaleDateString() ?? '—'}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{u.assessmentScorePct ?? '—'}%</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{u.assessmentCompleted ? 'Assessment done' : 'Pending'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/admin/members" className="btn btn-primary">View Members</Link>
        <Link href="/admin/assessments" className="btn btn-outline">View Assessments</Link>
        <Link href="/admin/programs" className="btn btn-outline">View Programs</Link>
      </div>

      <Footer />
    </div>
  );
}
