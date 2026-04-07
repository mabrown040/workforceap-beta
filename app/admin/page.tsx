import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import RecentSignupsTable from '@/components/admin/RecentSignupsTable';
import AdminDataLoadError from '@/components/admin/AdminDataLoadError';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
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

  let totalMembers: number;
  let assessmentsCompleted: number;
  let recentUsers;
  let recentPlacements;
  let pendingApplications: number;
  let activeInTraining: number;
  let programsCompleted: number;

  try {
    [totalMembers, assessmentsCompleted, recentUsers, recentPlacements, pendingApplications] = await Promise.all([
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

    activeInTraining = await prisma.user.count({
      where: {
        deletedAt: null,
        assessmentCompleted: true,
        enrolledProgram: { not: null },
      },
    });

    programsCompleted = await prisma.user.count({
      where: {
        deletedAt: null,
        assessmentCompleted: true,
        enrolledProgram: { not: null },
      },
    });
  } catch (e) {
    console.error('[admin/page] load failed', e);
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
    { icon: 'school', label: 'Programs Enrolled', value: programsCompleted.toLocaleString(), accent: '#fbbf24', href: '/admin/programs' },
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

  return (
    <PortalPageFrame>
      {/* ── Mobile Header (≤md) ── */}
      <div className="wa-md:wa-hidden" style={{ padding: '1.5rem 1.5rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="wa-text-[var(--color-on-surface-variant)] wa-text-xs wa-font-medium wa-tracking-widest wa-uppercase" style={{ marginBottom: '0.25rem' }}>Admin</p>
            <h1 className="wa-text-2xl wa-font-extrabold wa-tracking-tight wa-text-[var(--color-on-surface)]">
              Admin Overview
            </h1>
          </div>
        </div>
      </div>

      {/* ── Desktop Header ── */}
      <div className="wa-hidden wa-md:wa-block" style={{ marginBottom: '2.5rem' }}>
        <PageHeader
          title="Admin Dashboard"
          subtitle="Platform management and oversight."
          action={
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link href="/admin/pipeline" className="btn btn-outline">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>download</span>
                Export Data
              </Link>
              <Link href="/admin/programs" className="btn btn-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
                Create New Track
              </Link>
            </div>
          }
        />
      </div>

      {/* ── Pending Applications Alert ── */}
      {pendingApplications > 0 && (
        <div className="wa-md:wa-hidden portal-alert portal-alert--accent" style={{ margin: '0 1.5rem 1rem' }}>
          <span className="portal-alert__label">
            {pendingApplications} pending
          </span>
          <Link href="/admin/members" className="portal-alert__action">
            Review &rarr;
          </Link>
        </div>
      )}
      {pendingApplications > 0 && (
        <div className="wa-hidden wa-md:wa-block portal-alert portal-alert--accent" style={{ marginBottom: '1.5rem' }}>
          <span className="portal-alert__label">
            {pendingApplications} pending application{pendingApplications === 1 ? '' : 's'} awaiting review
          </span>
          <Link href="/admin/members" className="portal-alert__action">
            Review &rarr;
          </Link>
        </div>
      )}

      {/* ── Metric row (single treatment — desktop + mobile) ── */}
      <section style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <div className="portal-grid-metrics">
          {metricCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="stitch-card admin-metric-card"
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
                  <span className="material-symbols-outlined" style={{ color: card.accent }}>{card.icon}</span>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', opacity: 0.5 }} aria-hidden>
                  arrow_forward
                </span>
              </div>
              <span style={{ fontSize: 'clamp(1.35rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--color-on-surface)', display: 'block', lineHeight: 1 }}>{card.value}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.35rem', display: 'block' }}>{card.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Main Dashboard Layout ── */}
      <div className="wa-hidden wa-md:wa-block portal-grid-2col" style={{ gap: '2rem' }}>
        {/* ── Left Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Recent Signups Table with initials avatars */}
          <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(226,226,229,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-container)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-on-surface)' }}>Recent Signups</h3>
              <Link href="/admin/members" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}>
                View all &rarr;
              </Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(226,226,229,0.05)' }}>
                    {['Member', 'Track', 'Joined'].map((h) => (
                      <th key={h} style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>{h}</th>
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
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(226,226,229,0.05)' }}>
                        <td style={{ padding: '1rem 1.5rem' }}>
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
                              <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)' }}>{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>{track}</td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{timeAgo(u.createdAt)}</td>
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
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-on-surface)' }}>Recent Placements</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(226,226,229,0.05)' }}>
                      {['Student', 'Employer', 'Role', 'Program', 'Days', 'Salary', 'Date'].map((h) => (
                        <th key={h} style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(226,226,229,0.4)', fontWeight: 600 }}>{h}</th>
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
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(226,226,229,0.05)', transition: 'background-color 0.15s' }}>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: '2rem', height: '2rem', borderRadius: '0.25rem', background: 'var(--surface-container-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                                {(p.user.fullName ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </div>
                              <Link href={`/admin/members/${p.user.id}`} style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-on-surface)', textDecoration: 'none' }}>
                                {p.user.fullName}
                              </Link>
                            </div>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{p.employerName}</td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{p.jobTitle}</td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem' }}>{programTitle}</td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{daysToPlacement != null ? `${daysToPlacement}d` : '\u2014'}</td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#80d99f', fontWeight: 600 }}>
                            {p.salaryOffered ? `$${p.salaryOffered.toLocaleString()}` : '\u2014'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{p.placedAt.toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* System Configuration Grid */}
          <section>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1.25rem', color: 'var(--color-on-surface)' }}>System Configuration</h3>
            <div className="portal-grid-3col">
              {[
                { icon: 'language', label: 'Global Nodes', desc: 'Partners and organizations', href: '/admin/partners' },
                { icon: 'verified_user', label: 'Compliance', desc: 'Assessments and reviews', href: '/admin/assessments' },
                { icon: 'database', label: 'Data Clusters', desc: 'Programs and training tracks', href: '/admin/programs' },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="portal-action-row" style={{ gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.625rem', background: 'rgba(173,44,77,0.1)', borderRadius: '0.5rem' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.125rem' }}>{item.icon}</span>
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

          {/* Status Monitor */}
          <div className="stitch-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#80d99f', display: 'inline-block' }} />
              Status Monitor
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[
                { label: 'Gateway', status: 'Live', color: '#80d99f', icon: 'check_circle' },
                { label: 'Database', status: '99.9%', color: '#80d99f', icon: 'check_circle' },
                { label: 'LMS', status: 'Scheduled sync', color: '#fbbf24', icon: 'schedule' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: item.color }} aria-hidden>
                      {item.icon}
                    </span>
                    {item.label}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.color }}>{item.status}</span>
                </div>
              ))}
              <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(226,226,229,0.05)' }}>
                <div style={{ fontSize: '0.625rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>PLATFORM</div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-on-surface)' }}>Workforce Advancement Project</div>
              </div>
            </div>
          </div>

          {/* System Feed */}
          <div className="stitch-card-elevated" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-on-surface)' }}>System Feed</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', paddingLeft: '2.5rem' }}>
              <div style={{ position: 'absolute', left: '0.75rem', top: '2.5rem', bottom: 0, width: '1px', background: 'rgba(226,226,229,0.1)' }} />
              {recentUsers.slice(0, 4).map((u, i) => (
                <div key={u.id} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-2.5rem', top: '0.125rem', width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${i === 0 ? 'rgba(173,44,77,0.2)' : 'rgba(226,226,229,0.1)'}` }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', color: i === 0 ? 'var(--color-accent)' : 'var(--color-on-surface-variant)' }}>
                      {i === 0 ? 'person_add' : 'verified'}
                    </span>
                  </div>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                    {u.fullName ?? 'New user'} signed up
                  </span>
                  <span style={{ display: 'block', fontSize: '0.625rem', color: 'var(--color-on-surface-variant)' }}>
                    {timeAgo(u.createdAt)}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/admin/members" style={{ display: 'block', width: '100%', marginTop: '2rem', padding: '0.5rem', textAlign: 'center', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>
              View All Members
            </Link>
          </div>
        </div>
      </div>

      {/* ── Mobile Recent Signups Section ── */}
      <section className="wa-md:wa-hidden" style={{ padding: '0 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[var(--color-on-surface-variant)]">Recent Signups</h3>
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
      <section className="wa-md:wa-hidden" style={{ padding: '0 1.5rem', marginBottom: '6rem' }}>
        <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[var(--color-on-surface-variant)]" style={{ marginBottom: '0.75rem' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { icon: 'people', label: 'All Members', href: '/admin/members' },
            { icon: 'business', label: 'Employers', href: '/admin/employers' },
            { icon: 'handshake', label: 'Partners', href: '/admin/partners' },
            { icon: 'work', label: 'Job Board', href: '/admin/jobs' },
          ].map((action) => (
            <a key={action.label} href={action.href}
              className="active:scale-[0.97] wa-transition-transform" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', borderRadius: '0.75rem', textDecoration: 'none', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }}>
              <span className="material-symbols-outlined" style={{ marginBottom: '0.5rem', color: 'var(--color-accent)' }}>{action.icon}</span>
              <span className="wa-text-[11px] wa-font-bold wa-text-[var(--color-on-surface)] wa-tracking-tight">{action.label}</span>
            </a>
          ))}
        </div>
      </section>
    </PortalPageFrame>
  );
}
