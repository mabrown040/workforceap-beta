import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { Users, ClipboardList, GraduationCap, BookOpen, Trophy } from 'lucide-react';
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

  const [totalMembers, assessmentsCompleted, recentUsers, recentPlacements, pendingApplications] = await Promise.all([
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
    prisma.placementRecord.findMany({
      orderBy: { placedAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { id: true, fullName: true, enrolledProgram: true, enrolledAt: true },
        },
      },
    }),
    prisma.application.count({ where: { status: 'PENDING' } }),
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

  const totalPlacements = await prisma.placementRecord.count();

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
        <div className="admin-stat-card">
          <div className="admin-stat-card-icon"><Trophy size={24} className="text-current" /></div>
          <div className="admin-stat-card-label">Total Placements</div>
          <div className="admin-stat-card-value">{totalPlacements}</div>
        </div>
      </div>

      {pendingApplications > 0 && (
        <div style={{
          padding: '1rem 1.25rem',
          background: '#fffbeb',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontWeight: 600, color: '#92400e' }}>
            {pendingApplications} pending application{pendingApplications === 1 ? '' : 's'} awaiting review
          </span>
          <Link href="/admin/members" style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.9rem' }}>
            Review →
          </Link>
        </div>
      )}

      {recentPlacements.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent Placements</h2>
          <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Employer</th>
                  <th>Role</th>
                  <th>Program</th>
                  <th>Days to Placement</th>
                  <th>Salary</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {recentPlacements.map((p) => {
                  const programTitle = p.user.enrolledProgram
                    ? getProgramBySlug(p.user.enrolledProgram)?.title ?? p.user.enrolledProgram
                    : '—';
                  const daysToPlacement = p.user.enrolledAt
                    ? Math.floor((p.placedAt.getTime() - p.user.enrolledAt.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/members/${p.user.id}`}>{p.user.fullName}</Link>
                      </td>
                      <td>{p.employerName}</td>
                      <td>{p.jobTitle}</td>
                      <td style={{ fontSize: '0.85rem' }}>{programTitle}</td>
                      <td>{daysToPlacement != null ? `${daysToPlacement}d` : '—'}</td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>
                        {p.salaryOffered ? `$${p.salaryOffered.toLocaleString()}` : '—'}
                      </td>
                      <td>{p.placedAt.toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent signups</h2>
      <RecentSignupsTable users={recentUsers} />

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/admin/members" className="btn btn-primary">View Members</Link>
        <Link href="/admin/pipeline" className="btn btn-outline">View Pipeline</Link>
        <Link href="/admin/assessments" className="btn btn-outline">View Assessments</Link>
        <Link href="/admin/programs" className="btn btn-outline">View Programs</Link>
      </div>
    </div>
  );
}
