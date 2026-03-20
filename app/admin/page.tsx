import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { Users, ClipboardList, GraduationCap, BookOpen } from 'lucide-react';
import RecentSignupsTable from '@/components/admin/RecentSignupsTable';

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

      <div className="admin-stat-cards">
        <div className="admin-stat-card">
          <div className="admin-stat-card-icon"><Users size={24} className="text-current" /></div>
          <div className="admin-stat-card-label">Total Members</div>
          <div className="admin-stat-card-value">{totalMembers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card-icon"><ClipboardList size={24} className="text-current" /></div>
          <div className="admin-stat-card-label">Assessments Completed</div>
          <div className="admin-stat-card-value">{assessmentsCompleted}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card-icon"><GraduationCap size={24} className="text-current" /></div>
          <div className="admin-stat-card-label">Active in Training</div>
          <div className="admin-stat-card-value">{activeInTraining}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card-icon"><BookOpen size={24} className="text-current" /></div>
          <div className="admin-stat-card-label">Programs Enrolled</div>
          <div className="admin-stat-card-value">{programsCompleted}</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent signups</h2>
      <RecentSignupsTable users={recentUsers} />

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/admin/members" className="btn btn-primary">View Members</Link>
        <Link href="/admin/assessments" className="btn btn-outline">View Assessments</Link>
        <Link href="/admin/programs" className="btn btn-outline">View Programs</Link>
      </div>
    </div>
  );
}
