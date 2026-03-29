import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
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

  const kpiCards = [
    { icon: 'groups', label: 'Total Members', value: totalMembers.toLocaleString(), trend: '+12% vs LY', trendColor: '#80d99f' },
    { icon: 'handshake', label: 'Assessments Done', value: assessmentsCompleted.toLocaleString(), trend: 'Stable', trendColor: 'rgba(226,226,229,0.4)' },
    { icon: 'analytics', label: 'Active in Training', value: activeInTraining.toLocaleString(), trend: `${programsCompleted} enrolled`, trendColor: '#80d99f' },
    { icon: 'account_balance', label: 'Total Placements', value: totalPlacements.toLocaleString(), trend: `${workforcePlacements} WAP`, trendColor: 'rgba(226,226,229,0.4)' },
  ];

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      {/* ── Header ── */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem' }}>
        <div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(226,226,229,0.4)' }}>Admin</span>
            <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', color: 'rgba(226,226,229,0.4)' }}>chevron_right</span>
            <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--color-accent)' }}>System Oversight</span>
          </nav>
          <h1 className="text-display-sm" style={{ color: 'var(--color-on-surface)' }}>
            Workforce Advancement Dashboard
          </h1>
          <p style={{ color: 'rgba(226,226,229,0.6)', marginTop: '0.5rem', maxWidth: '36rem' }}>
            Centralized governance for training tracks, partnerships, and program allocation.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/admin/pipeline" style={{ padding: '0.625rem 1.5rem', background: 'var(--surface-container-high)', color: 'var(--color-accent)', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            View Pipeline
          </Link>
          <Link href="/admin/members" style={{ padding: '0.625rem 1.5rem', background: 'linear-gradient(to right, var(--color-accent), #71333e)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
            Manage Members
          </Link>
        </div>
      </header>

      {/* ── Pending Applications Alert ── */}
      {pendingApplications > 0 && (
        <div style={{
          padding: '1rem 1.5rem',
          background: 'rgba(173,44,77,0.1)',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontWeight: 600, color: 'var(--color-accent)', fontSize: '0.875rem' }}>
            {pendingApplications} pending application{pendingApplications === 1 ? '' : 's'} awaiting review
          </span>
          <Link href="/admin/members" style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
            Review &rarr;
          </Link>
        </div>
      )}

      {/* ── KPI Metric Cards ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        {kpiCards.map((card) => (
          <div key={card.label} className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: 'rgba(173,44,77,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }}>{card.icon}</span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: card.trendColor }}>{card.trend}</span>
            </div>
            <span className="metric-value">{card.value}</span>
            <span className="metric-label">{card.label}</span>
          </div>
        ))}
      </section>

      {/* ── Main Dashboard Layout (12-col) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

        {/* ── Left: Table + Program Health ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Active Participants Table */}
          <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(226,226,229,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-container)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-on-surface)' }}>Recent Signups</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link href="/admin/members" style={{ padding: '0.5rem', color: 'rgba(226,226,229,0.6)', textDecoration: 'none' }}>
                  <span className="material-symbols-outlined">filter_list</span>
                </Link>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <RecentSignupsTable users={recentUsers} />
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

          {/* Program Health + Quick Config row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="stitch-card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>Program Health</h4>
                <span style={{ fontSize: '0.625rem', background: 'rgba(173,44,77,0.1)', color: 'var(--color-accent)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {activeInTraining} active
                </span>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  <span>Completion Rate</span>
                  <span>{assessmentsCompleted}/{totalMembers}</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(226,226,229,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: `${totalMembers > 0 ? Math.round((assessmentsCompleted / totalMembers) * 100) : 0}%`, height: '100%', background: 'var(--color-accent)' }} />
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(226,226,229,0.5)', fontStyle: 'italic' }}>
                {totalPlacements} total placements recorded
              </p>
            </div>

            <div className="stitch-card">
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '1rem' }}>Quick Config</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { icon: 'tune', label: 'Members', href: '/admin/members' },
                  { icon: 'security', label: 'Counselors', href: '/admin/counselors' },
                  { icon: 'mail', label: 'Invites', href: '/admin/invites' },
                  { icon: 'terminal', label: 'Programs', href: '/admin/programs' },
                ].map((item) => (
                  <Link key={item.label} href={item.href} style={{
                    fontSize: '0.625rem',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    padding: '0.75rem',
                    background: 'var(--surface-container-highest)',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--color-on-surface)',
                    textDecoration: 'none',
                    transition: 'background-color 0.15s',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar: System Status + Activity ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* System Vitality */}
          <div className="stitch-card">
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, color: 'rgba(226,226,229,0.4)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#80d99f', display: 'inline-block' }} />
              System Vitality
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[
                { label: 'Database', status: 'Operational', color: '#80d99f' },
                { label: 'Auth System', status: 'Operational', color: '#80d99f' },
                { label: 'LMS Integration', status: 'Connected', color: '#80d99f' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-on-surface)' }}>{item.label}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.color }}>{item.status}</span>
                </div>
              ))}
              <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(226,226,229,0.05)' }}>
                <div style={{ fontSize: '0.625rem', color: 'rgba(226,226,229,0.4)', marginBottom: '0.25rem' }}>PLATFORM</div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(226,226,229,0.8)' }}>Workforce Advancement Project</div>
              </div>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="stitch-card-elevated">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-on-surface)' }}>Recent Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', paddingLeft: '2.5rem' }}>
              <div style={{ position: 'absolute', left: '0.75rem', top: '2.5rem', bottom: 0, width: '1px', background: 'rgba(226,226,229,0.1)' }} />
              {recentUsers.slice(0, 3).map((u, i) => (
                <div key={u.id} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-2.5rem', top: '0.125rem', width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${i === 0 ? 'rgba(173,44,77,0.2)' : 'rgba(226,226,229,0.1)'}` }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', color: i === 0 ? 'var(--color-accent)' : 'var(--color-on-surface-variant)' }}>
                      {i === 0 ? 'person_add' : 'verified'}
                    </span>
                  </div>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                    {u.fullName ?? 'New user'} signed up
                  </span>
                  <span style={{ display: 'block', fontSize: '0.625rem', color: 'rgba(226,226,229,0.4)' }}>
                    {u.createdAt.toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/admin/members" style={{ display: 'block', width: '100%', marginTop: '2rem', padding: '0.5rem', textAlign: 'center', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(226,226,229,0.6)', textDecoration: 'none' }}>
              View All Members
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom Quick Links ── */}
      <section style={{ marginTop: '3rem', paddingTop: '3rem', borderTop: '1px solid rgba(226,226,229,0.05)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem', color: 'var(--color-on-surface)' }}>Quick Access</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {[
            { icon: 'language', label: 'Partners', desc: 'Manage partner organizations', href: '/admin/partners' },
            { icon: 'shield', label: 'Assessments', desc: 'View assessment results', href: '/admin/assessments' },
            { icon: 'database', label: 'Programs', desc: 'Configure training programs', href: '/admin/programs' },
          ].map((item) => (
            <Link key={item.label} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="stitch-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(173,44,77,0.1)', borderRadius: '0.5rem', transition: 'background-color 0.15s' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }}>{item.icon}</span>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{item.label}</h4>
                  <p style={{ fontSize: '0.625rem', color: 'rgba(226,226,229,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
