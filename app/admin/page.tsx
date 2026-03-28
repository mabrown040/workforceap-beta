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
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin overview',
  description: 'Admin dashboard.',
  path: '/admin',
});

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const [totalMembers, assessmentsCompleted, recentUsers, recentPlacements, pendingApplications, workforcePlacements] =
    await Promise.all([
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
    prisma.placedOutcome.count(),
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
      <PageHeader title="Admin overview" subtitle="Manage members, employers, partners, and program metrics." />

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
          <div className="admin-stat-card-label">Counselor placements</div>
          <div className="admin-stat-card-value">{totalPlacements}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card-icon"><Trophy size={24} className="text-current" /></div>
          <div className="admin-stat-card-label">WorkforceAP placements (reported)</div>
          <div className="admin-stat-card-value">{workforcePlacements}</div>
        </div>
      </div>

      {pendingApplications > 0 && (
        <div className="admin-pending-banner">
          <span className="admin-pending-banner-text">
            {pendingApplications} pending application{pendingApplications === 1 ? '' : 's'} awaiting review
          </span>
          <Link href="/admin/members" className="admin-pending-banner-link">
            Review →
          </Link>
        </div>
      )}

      {recentPlacements.length > 0 && (
        <>
          <h2 className="admin-section-heading">Recent Placements</h2>
          <div className="admin-table-scroll">
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
                      <td className="admin-table-cell-sm">{programTitle}</td>
                      <td>{daysToPlacement != null ? `${daysToPlacement}d` : '—'}</td>
                      <td className="admin-salary-cell">
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

      <h2 className="admin-section-heading">Recent signups</h2>
      <RecentSignupsTable users={recentUsers} />

      <div className="admin-cta-buttons">
        <Link href="/admin/members" className="btn btn-primary">View Members</Link>
        <Link href="/admin/pipeline" className="btn btn-outline">View Pipeline</Link>
        <Link href="/admin/assessments" className="btn btn-outline">View Assessments</Link>
        <Link href="/admin/programs" className="btn btn-outline">View Programs</Link>
      </div>
    </div>
  );
}
