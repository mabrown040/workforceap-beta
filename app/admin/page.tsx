import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { countThreadsWithSlaBreach } from '@/lib/messages/superAdminMessageQueries';
import AdminDataLoadError from '@/components/admin/AdminDataLoadError';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin overview',
  description: 'Admin dashboard.',
  path: '/admin',
});

type RecentSignupRow = Prisma.UserGetPayload<{
  select: {
    id: true;
    fullName: true;
    email: true;
    enrolledProgram: true;
    enrolledAt: true;
    assessmentScorePct: true;
    assessmentCompleted: true;
    createdAt: true;
  };
}>;

type PlacementWithUser = Prisma.PlacementRecordGetPayload<{
  select: {
    id: true;
    employerName: true;
    jobTitle: true;
    startDate: true;
    salaryOffered: true;
    placedAt: true;
    user: {
      select: { id: true; fullName: true; email: true; enrolledProgram: true; enrolledAt: true };
    };
  };
}>;

type PendingPlacementWithUser = Prisma.PlacementRecordGetPayload<{
  select: {
    id: true;
    employerName: true;
    jobTitle: true;
    placedAt: true;
    user: {
      select: { id: true; fullName: true; email: true; enrolledProgram: true };
    };
  };
}>;

const placementRecordBaseSelect = {
  id: true,
  employerName: true,
  jobTitle: true,
  startDate: true,
  salaryOffered: true,
  placedAt: true,
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      enrolledProgram: true,
      enrolledAt: true,
    },
  },
} satisfies Prisma.PlacementRecordSelect;

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  let totalMembers: number;
  let assessmentsCompleted: number;
  let recentUsers: RecentSignupRow[];
  let recentPlacements: PlacementWithUser[];
  let pendingApplications: number;
  let activeInTraining: number;
  let programsEnrolled: number;
  let programsCompleted: number;
  let pendingPlacements: PendingPlacementWithUser[];

  function logPrismaReason(label: string, reason: unknown) {
    const msg = reason instanceof Error ? reason.message : String(reason);
    const code = reason instanceof Prisma.PrismaClientKnownRequestError ? reason.code : undefined;
    console.error(`[admin/page] ${label} failed`, code ?? '(no code)', msg);
  }

  try {
    // Match /admin/members: do not fail the whole dashboard when optional slices fail
    // (e.g. RLS/role differences on applications or placement_records vs users).
    const [
      totalMembersResult,
      assessmentsCompletedResult,
      recentUsersResult,
      recentPlacementsResult,
      pendingApplicationsResult,
      pendingPlacementsResult,
    ] = await Promise.allSettled([
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
        select: placementRecordBaseSelect,
      }),
      prisma.application.count({ where: { status: 'PENDING' } }),
      Promise.resolve([] as PendingPlacementWithUser[]),
    ]);

    if (totalMembersResult.status === 'rejected') {
      logPrismaReason('totalMembers', totalMembersResult.reason);
      throw totalMembersResult.reason;
    }
    if (assessmentsCompletedResult.status === 'rejected') {
      logPrismaReason('assessmentsCompleted', assessmentsCompletedResult.reason);
      throw assessmentsCompletedResult.reason;
    }
    if (recentUsersResult.status === 'rejected') {
      logPrismaReason('recentUsers', recentUsersResult.reason);
      throw recentUsersResult.reason;
    }

    totalMembers = totalMembersResult.value;
    assessmentsCompleted = assessmentsCompletedResult.value;
    recentUsers = recentUsersResult.value;

    if (recentPlacementsResult.status === 'rejected') {
      logPrismaReason('placementRecord.findMany', recentPlacementsResult.reason);
      recentPlacements = [];
    } else {
      recentPlacements = recentPlacementsResult.value;
    }

    if (pendingApplicationsResult.status === 'rejected') {
      logPrismaReason('application.count', pendingApplicationsResult.reason);
      pendingApplications = 0;
    } else {
      pendingApplications = pendingApplicationsResult.value;
    }

    if (pendingPlacementsResult.status === 'rejected') {
      logPrismaReason('placementRecord.pendingReview', pendingPlacementsResult.reason);
      pendingPlacements = [];
    } else {
      pendingPlacements = pendingPlacementsResult.value;
    }

    // Derive unique program counts in JS so the dashboard reflects distinct
    // programs, not duplicate member enrollments in the same program.
    // "Active in Training" counts enrolled members who have not finished every
    // course in their known program.
    const [programsResult] = await Promise.allSettled([
      prisma.user.findMany({
        where: {
          deletedAt: null,
          enrolledProgram: { not: null },
        },
        select: { enrolledProgram: true, coursesCompleted: true },
      }),
    ]);

    if (programsResult.status === 'rejected') {
      logPrismaReason('programMetrics', programsResult.reason);
      activeInTraining = 0;
      programsEnrolled = 0;
      programsCompleted = 0;
    } else {
      const enrolledPrograms = new Set<string>();
      const completedPrograms = new Set<string>();
      let activeInTrainingCount = 0;

      for (const u of programsResult.value) {
        if (!u.enrolledProgram) continue;
        enrolledPrograms.add(u.enrolledProgram);

        const program = getProgramBySlug(u.enrolledProgram);
        const completed = (u.coursesCompleted as string[] | null) ?? [];
        const fullyDone =
          program != null &&
          program.courses.length > 0 &&
          program.courses.every((c) => completed.includes(c.slug));

        if (fullyDone) {
          completedPrograms.add(u.enrolledProgram);
        } else {
          activeInTrainingCount += 1;
        }
      }

      activeInTraining = activeInTrainingCount;
      programsEnrolled = enrolledPrograms.size;
      programsCompleted = completedPrograms.size;
    }
  } catch (e) {
    logPrismaReason('critical block', e);
    return (
      <PortalPageFrame>
        <AdminDataLoadError title="Admin overview unavailable" />
      </PortalPageFrame>
    );
  }

  const metricCards: Array<{
    icon: string;
    label: string;
    value: string;
    accent: string;
    href: string;
  }> = [
    { icon: 'groups', label: 'Total Members', value: totalMembers.toLocaleString(), accent: 'var(--color-accent)', href: '/admin/members' },
    { icon: 'task_alt', label: 'Assessments Completed', value: assessmentsCompleted.toLocaleString(), accent: '#3b82f6', href: '/admin/assessments' },
    { icon: 'model_training', label: 'Active in Training', value: activeInTraining.toLocaleString(), accent: '#80d99f', href: '/admin/members' },
    { icon: 'school', label: 'Programs Enrolled', value: programsEnrolled.toLocaleString(), accent: '#fbbf24', href: '/admin/programs' },
    { icon: 'workspace_premium', label: 'Programs Completed', value: programsCompleted.toLocaleString(), accent: '#fbbf24', href: '/admin/programs' },
  ];

  function timeAgo(date: Date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d ago`;
  }

  const [slaBreaches48h, recentCronErrors] = await Promise.all([
    countThreadsWithSlaBreach(48).catch(() => 0),
    prisma.workflowDiagnostic.count({
      where: {
        status: { in: ['error', 'errored'] },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }).catch(() => 0),
  ]);

  return (
    <PortalPageFrame>
      <PageHeader
        title="Admin overview"
        subtitle="See who's signing up, how training is going, and where members are getting placed."
        action={
          <div className="employer-dash-header-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/admin/pipeline" className="btn btn-outline">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">account_tree</span>
              Pipeline
            </Link>
            <Link href="/admin/members" className="btn btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">groups</span>
              All Members
            </Link>
          </div>
        }
      />

      {(slaBreaches48h > 0 || recentCronErrors > 0) && (
        <div className="portal-alert" style={{ margin: '0 1.5rem 1.25rem', borderColor: 'rgba(173,44,77,0.35)' }}>
          <span className="portal-alert__label">
            {slaBreaches48h > 0 ? `${slaBreaches48h} member thread${slaBreaches48h === 1 ? '' : 's'} over 48h without reply` : 'No stale member threads'}
            {recentCronErrors > 0 ? ` · ${recentCronErrors} cron error${recentCronErrors === 1 ? '' : 's'} in the last 7 days` : ''}
          </span>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {slaBreaches48h > 0 && (
              <Link href="/admin/messages" className="portal-alert__action">
                Review messages &rarr;
              </Link>
            )}
            {recentCronErrors > 0 && (
              <Link href="/admin/email-crons" className="portal-alert__action">
                Check cron health &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Pending Applications Alert ── */}
      {pendingApplications > 0 && (
        <div className="md:wa-hidden portal-alert portal-alert--accent" style={{ margin: '0 1.5rem 1rem' }}>
          <span className="portal-alert__label">
            {pendingApplications} pending
          </span>
          <Link href="/admin/members" className="portal-alert__action">
            Review &rarr;
          </Link>
        </div>
      )}
      {pendingApplications > 0 && (
        <div className="wa-hidden md:wa-block portal-alert portal-alert--accent" style={{ marginBottom: '1.5rem' }}>
          <span className="portal-alert__label">
            {pendingApplications} pending application{pendingApplications === 1 ? '' : 's'} awaiting review
          </span>
          <Link href="/admin/members" className="portal-alert__action">
            Review &rarr;
          </Link>
        </div>
      )}
      {pendingPlacements.length > 0 && (
        <div className="wa-hidden md:wa-block portal-alert" style={{ marginBottom: '1.5rem', borderColor: 'rgba(128,217,159,0.35)' }}>
          <span className="portal-alert__label">
            {pendingPlacements.length} placement{pendingPlacements.length === 1 ? '' : 's'} waiting for counselor review
          </span>
          <Link href="/admin/members" className="portal-alert__action">
            Finalize &rarr;
          </Link>
        </div>
      )}

      {/* ── In-office Sessions Section ── */}
      <section style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <h2 className="portal-section-heading" style={{ marginBottom: '0.75rem' }}>In-office sessions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1rem' }}>
          <Link
            href="/admin/sessions/walk-in"
            className="portal-card portal-card--flat"
            style={{ display: 'block', padding: '1.5rem', textDecoration: 'none', color: 'inherit', border: '2px solid var(--color-accent)', boxShadow: '0 8px 24px rgba(173,44,77,0.12)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ background: 'rgba(173,44,77,0.12)', color: 'var(--color-accent)', borderRadius: 'var(--radius-md)', padding: '0.5rem', display: 'inline-flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }} aria-hidden="true">person_add</span>
              </span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Walk-in</h3>
            </div>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Someone new sat down. Create their account, build their profile, and ship them resume + cover letter + interview prep in one session.
            </p>
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent)' }}>
              Start walk-in &rarr;
            </div>
          </Link>

          <Link
            href="/admin/members"
            className="portal-card portal-card--flat"
            style={{ display: 'block', padding: '1.5rem', textDecoration: 'none', color: 'inherit', border: '1px solid var(--outline-variant)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ background: 'rgba(43,123,185,0.12)', color: 'var(--color-blue, #2b7bb9)', borderRadius: 'var(--radius-md)', padding: '0.5rem', display: 'inline-flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }} aria-hidden="true">people</span>
              </span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Existing member</h3>
            </div>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Pick any member from the full directory. Update their profile, then run the same 4-step build — outputs save to their portal and email.
            </p>
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-blue, #2b7bb9)' }}>
              Pick a member &rarr;
            </div>
          </Link>
        </div>
      </section>

      {/* ── Metric row (single treatment — desktop + mobile) ── */}
      <section style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <div className="portal-grid-metrics">
          {metricCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="portal-card portal-card--flat admin-metric-card"
              style={{
                padding: '1.25rem',
                transition: 'transform 0.15s, box-shadow 0.2s',
                cursor: 'pointer',
                position: 'relative',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: `${card.accent}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: card.accent }} aria-hidden="true">{card.icon}</span>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', opacity: 0.5 }} aria-hidden>
                  arrow_forward
                </span>
              </div>
              <span style={{ fontSize: 'clamp(1.35rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--color-on-surface)', display: 'block', lineHeight: 1 }}>{card.value}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.35rem', display: 'block' }}>{card.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Main Dashboard Layout ── */}
      <div className="wa-hidden md:wa-block portal-grid-2col" style={{ gap: '2rem' }}>
        {/* ── Left Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Recent Signups Table with initials avatars */}
          <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(226,226,229,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-container)' }}>
              <h2 className="portal-section-heading" style={{ margin: 0 }}>Recent Signups</h2>
              <Link href="/admin/members" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}>
                View all &rarr;
              </Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    {['Member', 'Track', 'Joined'].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.slice(0, 6).map((u) => {
                    const initials = (u.fullName ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                    const track = u.enrolledProgram
                      ? (getProgramBySlug(u.enrolledProgram)?.title ?? u.enrolledProgram)
                      : 'Pending enrollment';
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                              background: 'var(--surface-container-highest)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-accent)',
                            }}>
                              {initials}
                            </div>
                            <div>
                              <Link href={`/admin/members/${u.id}`} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)', textDecoration: 'none' }}>
                                {u.fullName ?? 'Unknown'}
                              </Link>
                              <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>{track}</td>
                        <td style={{ fontSize: '0.75rem' }}>{timeAgo(u.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Placements */}
          {recentPlacements.length > 0 && (
            <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(226,226,229,0.05)', background: 'var(--surface-container)' }}>
                <h3 className="portal-section-heading" style={{ margin: 0 }}>Recent Placements</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      {['Member', 'Employer', 'Role', 'Program', 'Days', 'Salary', 'Date'].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentPlacements.map((p) => {
                      const programTitle = p.user.enrolledProgram
                        ? getProgramBySlug(p.user.enrolledProgram)?.title ?? p.user.enrolledProgram
                        : '\u2014';
                      const daysToPlacement = p.user.enrolledAt
                        ? Math.floor((p.placedAt.getTime() - p.user.enrolledAt.getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: '2rem', height: '2rem', borderRadius: '0.25rem', background: 'var(--surface-container-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                                {(p.user.fullName ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </div>
                              <Link href={`/admin/members/${p.user.id}`} style={{ fontWeight: 500, color: 'var(--color-on-surface)', textDecoration: 'none' }}>
                                {p.user.fullName}
                              </Link>
                            </div>
                          </td>
                          <td>{p.employerName}</td>
                          <td>{p.jobTitle}</td>
                          <td>{programTitle}</td>
                          <td>{daysToPlacement != null ? `${daysToPlacement}d` : '\u2014'}</td>
                          <td style={{ color: '#80d99f', fontWeight: 600 }}>
                            {p.salaryOffered ? `$${p.salaryOffered.toLocaleString()}` : '\u2014'}
                          </td>
                          <td>{p.placedAt.toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pendingPlacements.length > 0 && (
            <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(226,226,229,0.05)', background: 'var(--surface-container)' }}>
                <h3 className="portal-section-heading" style={{ margin: 0 }}>Pending Placements</h3>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>
                  Member-confirmed placements waiting for counselor verification.
                </p>
              </div>
              <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingPlacements.map((placement) => (
                  <div
                    key={placement.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      padding: '0.9rem 1rem',
                      borderRadius: '0.75rem',
                      background: 'var(--surface-container)',
                    }}
                  >
                    <div>
                      <Link href={`/admin/members/${placement.user.id}`} style={{ fontWeight: 600, color: 'var(--color-on-surface)', textDecoration: 'none' }}>
                        {placement.user.fullName}
                      </Link>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginTop: '0.2rem' }}>
                        {placement.employerName} · {placement.jobTitle}
                        {placement.user.enrolledProgram ? ` · ${getProgramBySlug(placement.user.enrolledProgram)?.title ?? placement.user.enrolledProgram}` : ''}
                      </div>
                    </div>
                    <Link href={`/admin/members/${placement.user.id}`} className="btn btn-outline">
                      Review record
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <section>
            <h3 className="portal-section-heading">Quick Links</h3>
            <div className="portal-grid-3col">
              {[
                { icon: 'mark_email_unread', label: 'Messages', desc: 'Portal threads and staff replies', href: '/admin/messages' },
                { icon: 'handshake', label: 'Partners', desc: 'Community organizations', href: '/admin/partners' },
                { icon: 'task_alt', label: 'Assessments', desc: 'Skills assessments and scores', href: '/admin/assessments' },
                { icon: 'school', label: 'Programs', desc: 'Training tracks and courses', href: '/admin/programs' },
                { icon: 'sync', label: 'Coursera', desc: 'Identity mapping and xAPI review', href: '/admin/coursera' },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="portal-action-row" style={{ gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.625rem', background: 'rgba(173,44,77,0.1)', borderRadius: '0.5rem' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.125rem' }} aria-hidden="true">{item.icon}</span>
                    </div>
                    <div>
                      <h4 className="portal-action-row__title">{item.label}</h4>
                      <p className="portal-action-row__desc">{item.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* ── Right Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* At a Glance */}
          <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
            <h3 className="portal-section-title" style={{ marginBottom: '1.5rem' }}>
              At a Glance
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Link href="/admin/members" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', textDecoration: 'none' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden>groups</span>
                  Total Members
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-accent)' }}>{totalMembers}</span>
              </Link>
              <Link href="/admin/pipeline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', textDecoration: 'none' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#80d99f' }} aria-hidden>model_training</span>
                  Active in Training
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#80d99f' }}>{activeInTraining}</span>
              </Link>
              <Link href="/admin/assessments" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', textDecoration: 'none' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#3b82f6' }} aria-hidden>task_alt</span>
                  Assessments Done
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#3b82f6' }}>{assessmentsCompleted}</span>
              </Link>
              {pendingApplications > 0 && (
                <Link href="/admin/members" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', textDecoration: 'none' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#fbbf24' }} aria-hidden>pending_actions</span>
                    Pending Review
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fbbf24' }}>{pendingApplications}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="portal-card portal-card--elevated" style={{ padding: '1.5rem' }}>
            <h3 className="portal-section-heading" style={{ marginBottom: '1.5rem' }}>Recent Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', paddingLeft: '2.5rem' }}>
              <div style={{ position: 'absolute', left: '0.75rem', top: '2.5rem', bottom: 0, width: '1px', background: 'rgba(226,226,229,0.1)' }} />
              {recentUsers.slice(0, 4).map((u, i) => (
                <div key={u.id} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-2.5rem', top: '0.125rem', width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${i === 0 ? 'rgba(173,44,77,0.2)' : 'rgba(226,226,229,0.1)'}` }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', color: i === 0 ? 'var(--color-accent)' : 'var(--color-on-surface-variant)' }} aria-hidden="true">
                      {i === 0 ? 'person_add' : 'verified'}
                    </span>
                  </div>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                    {u.fullName ?? 'New user'} signed up
                  </span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                    {timeAgo(u.createdAt)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link href="/admin/members" className="portal-section-action">
                View all members
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Recent Signups Section ── */}
      <section className="md:wa-hidden" style={{ padding: '0 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[var(--color-on-surface-variant)]">Recent Signups</h2>
          <Link href="/admin/members" className="wa-text-xs wa-font-bold wa-text-[var(--color-accent-dark)]" style={{ textDecoration: 'none' }}>View all →</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {recentUsers.slice(0, 5).map((u) => {
            const initials = (u.fullName ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
            const track = u.enrolledProgram
              ? (getProgramBySlug(u.enrolledProgram)?.title ?? u.enrolledProgram)
              : 'Pending enrollment';
            return (
              <Link key={u.id} href={`/admin/members/${u.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface-container)', borderRadius: '0.75rem' }}>
                  <div style={{
                    width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                    background: 'var(--surface-container-highest)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-accent)', flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="wa-text-sm wa-font-bold wa-text-[var(--color-on-surface)] wa-leading-tight">{u.fullName ?? 'Unknown'}</p>
                    <p className="wa-text-xs wa-text-[var(--color-on-surface-variant)] wa-truncate">{track}</p>
                  </div>
                  <span className="wa-text-xs wa-text-[var(--color-on-surface-variant)]">{timeAgo(u.createdAt)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Mobile Quick Actions ── */}
      <section className="md:wa-hidden" style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[var(--color-on-surface-variant)]" style={{ marginBottom: '0.75rem' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { icon: 'people', label: 'All Members', href: '/admin/members' },
            { icon: 'business', label: 'Employers', href: '/admin/employers' },
            { icon: 'handshake', label: 'Partners', href: '/admin/partners' },
            { icon: 'sync', label: 'Coursera', href: '/admin/coursera' },
          ].map((action) => (
            <Link key={action.label} href={action.href}
              className="active:scale-[0.97] wa-transition-transform" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', borderRadius: '0.75rem', textDecoration: 'none', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }}>
              <span className="material-symbols-outlined" style={{ marginBottom: '0.5rem', color: 'var(--color-accent)' }} aria-hidden="true">{action.icon}</span>
              <span className="wa-text-[11px] wa-font-bold wa-text-[var(--color-on-surface)] wa-tracking-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </PortalPageFrame>
  );
}
