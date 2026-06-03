import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { loadTrainingDashboardData } from '@/lib/admin/trainingDashboard';
import { getTriageDigest, type TriageDigest } from '@/lib/admin/triageDigest';
import { countThreadsWithSlaBreach } from '@/lib/messages/superAdminMessageQueries';
import AdminDataLoadError from '@/components/admin/AdminDataLoadError';
import TriageDigestSection from '@/components/admin/TriageDigestSection';
import GtmSetupCheck from '@/components/admin/GtmSetupCheck';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import DataTable from '@/components/portal/ui/DataTable';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Admin overview',
  description: 'Admin dashboard.',
  path: '/admin',
});
}

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
  const superAdmin = await isSuperAdmin(user.id);

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

    const [trainingDashboardResult] = await Promise.allSettled([loadTrainingDashboardData()]);

    if (trainingDashboardResult.status === 'rejected') {
      logPrismaReason('trainingDashboardMetrics', trainingDashboardResult.reason);
      activeInTraining = 0;
      programsEnrolled = 0;
      programsCompleted = 0;
    } else {
      const training = trainingDashboardResult.value;
      activeInTraining = training.metrics.activeInTraining;
      programsEnrolled = new Set(training.rows.map((row) => row.enrolledProgram)).size;
      programsCompleted = new Set(
        training.rows
          .filter((row) => row.progressPercent >= 100 || row.completedCount >= row.totalCourses)
          .map((row) => row.enrolledProgram)
      ).size;
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
    { icon: 'model_training', label: 'Active in Training', value: activeInTraining.toLocaleString(), accent: '#80d99f', href: '/admin/members/training' },
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

  const [slaBreaches48h, recentCronErrors, triageDigest] = await Promise.all([
    countThreadsWithSlaBreach(48).catch(() => 0),
    prisma.workflowDiagnostic.count({
      where: {
        status: { in: ['error', 'errored'] },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }).catch(() => 0),
    getTriageDigest().catch((reason): TriageDigest => {
      logPrismaReason('triageDigest', reason);
      return { buckets: [], allClear: true };
    }),
  ]);

  return (
    <PortalPageFrame>
      <PageHeader
        title="Admin overview"
        subtitle="See who's signing up, how training is going, and where members are getting placed."
        action={
          <div className="employer-dash-header-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href="/api/admin/funder-program-summary" className="btn btn-outline">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">
                download
              </span>
              Export funder CSV
            </a>
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

      {superAdmin && (
        <section
          className="portal-card portal-card--flat"
          style={{ margin: '0 1.5rem 1.25rem', padding: '0.9rem 1rem' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--color-on-surface-variant)',
                  margin: 0,
                }}
              >
                Super Admin Portal Views
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0' }}>
                View real employer and partner portals with live data. Select an org below.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link href="/admin/employers" className="btn btn-outline btn-sm">
                View employer portal
              </Link>
              <Link href="/counselor" className="btn btn-outline btn-sm">
                Counselor preview
              </Link>
              <Link href="/admin/partners" className="btn btn-outline btn-sm">
                View partner portal
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Split into one alert per signal so each has its own action.
          Closes audit #85: previously both lived in a single alert label
          and the two CTAs read as equal-weight against a combined headline. */}
      {slaBreaches48h > 0 && (
        <div className="portal-alert" style={{ margin: '0 1.5rem 0.75rem', borderColor: 'rgba(173,44,77,0.35)' }}>
          <span className="portal-alert__label">
            {`${slaBreaches48h} member thread${slaBreaches48h === 1 ? '' : 's'} over 48h without reply`}
          </span>
          <Link href="/admin/messages" className="portal-alert__action">
            Review messages &rarr;
          </Link>
        </div>
      )}
      {recentCronErrors > 0 && (
        <div className="portal-alert" style={{ margin: '0 1.5rem 1.25rem', borderColor: 'rgba(173,44,77,0.35)' }}>
          <span className="portal-alert__label">
            {`${recentCronErrors} cron error${recentCronErrors === 1 ? '' : 's'} in the last 7 days`}
          </span>
          <Link href="/admin/email-crons" className="portal-alert__action">
            Check cron health &rarr;
          </Link>
        </div>
      )}

      {/* ── GTM Setup Check ── */}
      <GtmSetupCheck />

      {/* ── Pending Applications Alert ── */}
      {pendingApplications > 0 && (
        <>
          <div className="md:wa-hidden">
            <div className="portal-alert portal-alert--accent" style={{ margin: '0 1.5rem 1rem' }}>
              <span className="portal-alert__label">
                {pendingApplications} pending
              </span>
              <Link href="/admin/members" className="portal-alert__action">
                Review &rarr;
              </Link>
            </div>
          </div>
          <div className="wa-hidden md:wa-block" style={{ marginBottom: '1.5rem' }}>
            <div className="portal-alert portal-alert--accent" style={{ margin: 0 }}>
              <span className="portal-alert__label">
                {pendingApplications} pending application{pendingApplications === 1 ? '' : 's'} awaiting review
              </span>
              <Link href="/admin/members" className="portal-alert__action">
                Review &rarr;
              </Link>
            </div>
          </div>
        </>
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


      {/* ── "Who needs you today" triage ── */}
      <TriageDigestSection digest={triageDigest} />

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

      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.2)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(226,226,229,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', background: 'var(--surface-container)' }}>
            <h2 className="portal-section-heading" style={{ margin: 0 }}>Recent Signups</h2>
            <Link href="/admin/members" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              View all &rarr;
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentUsers.slice(0, 6).map((u, index) => {
              const initials = (u.fullName ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
              const track = u.enrolledProgram
                ? (getProgramBySlug(u.enrolledProgram)?.title ?? u.enrolledProgram)
                : 'Pending enrollment';

              return (
                <Link
                  key={u.id}
                  href={`/admin/members/${u.id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    borderTop: index === 0 ? 'none' : '1px solid rgba(226,226,229,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '1rem 1.5rem' }}>
                    <div style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: '50%',
                      background: 'var(--surface-container-highest)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--color-accent)',
                      flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-on-surface)', margin: 0 }}>
                        {u.fullName ?? 'Unknown'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.2rem 0 0' }}>
                        {u.email}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface)', margin: '0.45rem 0 0' }}>
                        {track}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap', paddingTop: '0.15rem' }}>
                      {timeAgo(u.createdAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Main Dashboard Layout ── */}
      <div className="wa-hidden md:wa-block portal-grid-2col" style={{ gap: '2rem' }}>
        {/* ── Left Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Recent Placements */}
          {recentPlacements.length > 0 && (
            <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(226,226,229,0.05)', background: 'var(--surface-container)' }}>
                <h3 className="portal-section-heading" style={{ margin: 0 }}>Recent Placements</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <DataTable
                  variant="admin"
                  tableClassName="dashboard-table"
                  scrollX={false}
                  rows={recentPlacements}
                  rowKey={(p) => p.id}
                  columns={[
                    {
                      key: 'member',
                      header: 'Member',
                      cell: (p) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '2rem',
                              height: '2rem',
                              borderRadius: '0.25rem',
                              background: 'var(--surface-container-highest)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: 'var(--color-accent)',
                            }}
                          >
                            {(p.user.fullName ?? '?')
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <Link
                            href={`/admin/members/${p.user.id}`}
                            style={{ fontWeight: 500, color: 'var(--color-on-surface)', textDecoration: 'none' }}
                          >
                            {p.user.fullName}
                          </Link>
                        </div>
                      ),
                    },
                    { key: 'employer', header: 'Employer', cell: (p) => p.employerName },
                    { key: 'role', header: 'Role', cell: (p) => p.jobTitle },
                    {
                      key: 'program',
                      header: 'Program',
                      cell: (p) =>
                        p.user.enrolledProgram
                          ? getProgramBySlug(p.user.enrolledProgram)?.title ?? p.user.enrolledProgram
                          : '\u2014',
                    },
                    {
                      key: 'days',
                      header: 'Days',
                      cell: (p) => {
                        const daysToPlacement = p.user.enrolledAt
                          ? Math.floor((p.placedAt.getTime() - p.user.enrolledAt.getTime()) / (1000 * 60 * 60 * 24))
                          : null;
                        return daysToPlacement != null ? `${daysToPlacement}d` : '\u2014';
                      },
                    },
                    {
                      key: 'salary',
                      header: 'Salary',
                      cell: (p) => (
                        <span style={{ color: '#80d99f', fontWeight: 600 }}>
                          {p.salaryOffered ? `$${p.salaryOffered.toLocaleString()}` : '\u2014'}
                        </span>
                      ),
                    },
                    {
                      key: 'date',
                      header: 'Date',
                      cell: (p) => p.placedAt.toLocaleDateString(),
                    },
                  ]}
                />
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
                { icon: 'table_view', label: 'Training progress', desc: 'Per-learner curriculum + raw Coursera, sortable', href: '/admin/training-progress' },
                { icon: 'mail', label: 'Email Templates', desc: 'Preview and manage transactional emails', href: '/admin/email-templates' },
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
              <div style={{ borderTop: '1px solid rgba(226,226,229,0.08)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                <Link href="/admin/members" className="portal-section-action">
                  View all members
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Quick Actions ── */}
      <section className="md:wa-hidden" style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[var(--color-on-surface-variant)]" style={{ marginBottom: '0.75rem' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <a
            href="/api/admin/funder-program-summary"
            className="active:scale-[0.97] wa-transition-transform"
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1rem',
              borderRadius: '0.75rem',
              textDecoration: 'none',
              background: 'var(--surface-container-lowest)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)' }} aria-hidden="true">
              download
            </span>
            <span className="wa-text-[11px] wa-font-bold wa-text-[var(--color-on-surface)] wa-tracking-tight">Export funder CSV</span>
          </a>
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
