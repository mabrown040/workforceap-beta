import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { Users, ClipboardList, GraduationCap, BookOpen, Trophy, FileText, ArrowRight } from 'lucide-react';
import RecentSignupsTable from '@/components/admin/RecentSignupsTable';

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

  const placementRate =
    totalMembers > 0 ? ((totalPlacements / totalMembers) * 100).toFixed(1) : '0';

  /* Aggregate enrolled programs from recent users for Program Health card */
  const programCounts: Record<string, number> = {};
  for (const u of recentUsers) {
    if (u.enrolledProgram) {
      const label = getProgramBySlug(u.enrolledProgram)?.title ?? u.enrolledProgram;
      programCounts[label] = (programCounts[label] ?? 0) + 1;
    }
  }
  const programHealthList = Object.entries(programCounts)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="wa-space-y-8">
      {/* ── Hero header ── */}
      <header className="wa-flex wa-flex-col sm:wa-flex-row wa-items-start sm:wa-items-end wa-justify-between wa-gap-4">
        <div>
          <h1 className="wa-text-4xl wa-font-extrabold wa-italic wa-tracking-tight wa-text-m3-on-surface">
            Workforce Pulse.
          </h1>
          <p className="wa-mt-1 wa-text-base wa-text-m3-on-surface-variant">
            Manage members, employers, partners, and program metrics.
          </p>
        </div>
        <div className="wa-flex wa-items-center wa-gap-3">
          <Link
            href="/admin/programs"
            className="wa-inline-flex wa-items-center wa-gap-2 wa-rounded-full wa-border wa-border-m3-outline wa-px-5 wa-py-2.5 wa-text-sm wa-font-semibold wa-text-m3-on-surface wa-transition-colors hover:wa-bg-m3-surface-container-high"
          >
            Manage Programs
          </Link>
          <Link
            href="/admin/assessments"
            className="wa-inline-flex wa-items-center wa-gap-2 wa-rounded-full wa-bg-m3-primary wa-px-5 wa-py-2.5 wa-text-sm wa-font-semibold wa-text-m3-on-primary wa-transition-colors hover:wa-bg-m3-primary/90"
          >
            <FileText size={16} aria-hidden />
            Generate Audit
          </Link>
        </div>
      </header>

      {/* ── Bento grid ── */}
      <div className="wa-grid wa-grid-cols-12 wa-gap-4">
        {/* Large card: Economic Momentum */}
        <div className="wa-col-span-12 lg:wa-col-span-8 wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-6">
          <p className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-m3-primary wa-mb-1">
            Economic Momentum
          </p>
          <p className="wa-text-5xl wa-font-extrabold wa-tracking-tight wa-text-m3-on-surface wa-mb-6">
            {totalPlacements}
            <span className="wa-text-lg wa-font-medium wa-text-m3-on-surface-variant wa-ml-2">
              total placements
            </span>
          </p>
          <div className="wa-grid wa-grid-cols-3 wa-gap-4">
            <div className="wa-rounded-xl wa-bg-m3-surface-container wa-p-4">
              <p className="wa-text-2xl wa-font-bold wa-text-m3-on-surface">{placementRate}%</p>
              <p className="wa-text-xs wa-text-m3-on-surface-variant">Placement Rate</p>
            </div>
            <div className="wa-rounded-xl wa-bg-m3-surface-container wa-p-4">
              <p className="wa-text-2xl wa-font-bold wa-text-m3-on-surface">{programsCompleted}</p>
              <p className="wa-text-xs wa-text-m3-on-surface-variant">Active Scholars</p>
            </div>
            <div className="wa-rounded-xl wa-bg-m3-surface-container wa-p-4">
              <p className="wa-text-2xl wa-font-bold wa-text-m3-on-surface">{activeInTraining}</p>
              <p className="wa-text-xs wa-text-m3-on-surface-variant">In Training</p>
            </div>
          </div>
        </div>

        {/* Side card: Program Health */}
        <div className="wa-col-span-12 lg:wa-col-span-4 wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-6">
          <p className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-m3-primary wa-mb-4">
            Program Health
          </p>
          {programHealthList.length === 0 ? (
            <p className="wa-text-sm wa-text-m3-on-surface-variant">No program enrollments in recent users.</p>
          ) : (
            <ul className="wa-space-y-3">
              {programHealthList.map(([name, count]) => (
                <li key={name} className="wa-flex wa-items-center wa-justify-between wa-text-sm">
                  <span className="wa-text-m3-on-surface wa-truncate wa-mr-2">{name}</span>
                  <span className="wa-inline-flex wa-items-center wa-justify-center wa-rounded-full wa-bg-m3-primary-container wa-text-m3-on-primary-container wa-px-2.5 wa-py-0.5 wa-text-xs wa-font-semibold wa-min-w-[28px]">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bottom left: Registry Status */}
        <div className="wa-col-span-12 lg:wa-col-span-5 wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-6">
          <p className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-m3-primary wa-mb-4">
            Registry Status
          </p>
          <dl className="wa-space-y-3">
            {[
              { label: 'Total Members', value: totalMembers, icon: Users },
              { label: 'Assessments', value: assessmentsCompleted, icon: ClipboardList },
              { label: 'Placements', value: totalPlacements, icon: Trophy },
              { label: 'Programs Enrolled', value: programsCompleted, icon: GraduationCap },
              { label: 'WorkforceAP Placements', value: workforcePlacements, icon: BookOpen },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="wa-flex wa-items-center wa-justify-between wa-py-2 wa-border-b wa-border-m3-outline-variant/15 last:wa-border-b-0">
                <dt className="wa-flex wa-items-center wa-gap-2 wa-text-sm wa-text-m3-on-surface-variant">
                  <Icon size={16} aria-hidden className="wa-text-m3-primary" />
                  {label}
                </dt>
                <dd className="wa-text-sm wa-font-semibold wa-text-m3-on-surface">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Bottom right: System Narrative */}
        <div className="wa-col-span-12 lg:wa-col-span-7 wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-6">
          <p className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-m3-primary wa-mb-4">
            System Narrative
          </p>
          {recentPlacements.length === 0 ? (
            <p className="wa-text-sm wa-text-m3-on-surface-variant">No recent placement events.</p>
          ) : (
            <ul className="wa-space-y-3">
              {recentPlacements.map((p) => {
                const programTitle = p.user.enrolledProgram
                  ? getProgramBySlug(p.user.enrolledProgram)?.title ?? p.user.enrolledProgram
                  : null;
                return (
                  <li key={p.id} className="wa-flex wa-items-start wa-gap-3">
                    <span className="wa-mt-1.5 wa-h-2 wa-w-2 wa-shrink-0 wa-rounded-full wa-bg-m3-tertiary" aria-hidden />
                    <div className="wa-text-sm">
                      <Link href={`/admin/members/${p.user.id}`} className="wa-font-semibold wa-text-m3-primary hover:wa-underline">
                        {p.user.fullName}
                      </Link>
                      <span className="wa-text-m3-on-surface-variant">
                        {' '}placed at{' '}
                        <span className="wa-font-medium wa-text-m3-on-surface">{p.employerName}</span>
                        {' '}as {p.jobTitle}
                        {programTitle && <> via {programTitle}</>}
                        {p.salaryOffered && (
                          <span className="wa-ml-1 wa-text-m3-tertiary wa-font-semibold">
                            ${p.salaryOffered.toLocaleString()}
                          </span>
                        )}
                        {' '}&middot; {p.placedAt.toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Pending applications alert ── */}
      {pendingApplications > 0 && (
        <div className="wa-flex wa-items-center wa-justify-between wa-rounded-xl wa-border wa-border-yellow-400 wa-bg-yellow-50 wa-px-5 wa-py-4">
          <span className="wa-text-sm wa-font-semibold wa-text-yellow-800">
            {pendingApplications} pending application{pendingApplications === 1 ? '' : 's'} awaiting review
          </span>
          <Link href="/admin/members" className="wa-inline-flex wa-items-center wa-gap-1 wa-text-sm wa-font-semibold wa-text-m3-primary hover:wa-underline">
            Review <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      )}

      {/* ── Recent signups ── */}
      <section>
        <h2 className="wa-text-lg wa-font-bold wa-text-m3-on-surface wa-mb-3">Recent signups</h2>
        <RecentSignupsTable users={recentUsers} />
      </section>

      {/* ── Quick links ── */}
      <div className="wa-flex wa-flex-wrap wa-gap-3">
        <Link
          href="/admin/members"
          className="wa-inline-flex wa-items-center wa-gap-2 wa-rounded-full wa-bg-m3-primary wa-px-5 wa-py-2.5 wa-text-sm wa-font-semibold wa-text-m3-on-primary wa-transition-colors hover:wa-bg-m3-primary/90"
        >
          View Members
        </Link>
        <Link
          href="/admin/pipeline"
          className="wa-inline-flex wa-items-center wa-gap-2 wa-rounded-full wa-border wa-border-m3-outline wa-px-5 wa-py-2.5 wa-text-sm wa-font-semibold wa-text-m3-on-surface wa-transition-colors hover:wa-bg-m3-surface-container-high"
        >
          View Pipeline
        </Link>
        <Link
          href="/admin/assessments"
          className="wa-inline-flex wa-items-center wa-gap-2 wa-rounded-full wa-border wa-border-m3-outline wa-px-5 wa-py-2.5 wa-text-sm wa-font-semibold wa-text-m3-on-surface wa-transition-colors hover:wa-bg-m3-surface-container-high"
        >
          View Assessments
        </Link>
        <Link
          href="/admin/programs"
          className="wa-inline-flex wa-items-center wa-gap-2 wa-rounded-full wa-border wa-border-m3-outline wa-px-5 wa-py-2.5 wa-text-sm wa-font-semibold wa-text-m3-on-surface wa-transition-colors hover:wa-bg-m3-surface-container-high"
        >
          View Programs
        </Link>
      </div>
    </div>
  );
}
