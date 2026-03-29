import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { counselorAffiliationLabel } from '@/lib/counselor/counselorLabels';

export default async function CounselorPortalPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor');

  const allowed = (await isCounselor(user.id)) || (await isAdmin(user.id));
  if (!allowed) redirect('/dashboard');

  const counselor = await prisma.counselor.findFirst({
    where: { userId: user.id, active: true },
    include: { partner: { select: { name: true } } },
  });

  if (!counselor && !(await isAdmin(user.id))) redirect('/dashboard');

  const assignments = counselor
    ? await prisma.counselorAssignment.findMany({
        where: {
          counselor: { userId: user.id, active: true },
          active: true,
        },
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              email: true,
              programInterest: true,
              enrolledProgram: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      })
    : [];

  let messagesNeedingReply = 0;
  if (counselor && assignments.length > 0) {
    const memberIds = assignments.map((a) => a.memberId);
    const threads = await prisma.messageThread.findMany({
      where: { memberId: { in: memberIds }, kind: 'member' },
      select: { id: true, memberId: true },
    });
    for (const t of threads) {
      if (!t.memberId) continue;
      const lastMsg = await prisma.message.findFirst({
        where: { threadId: t.id },
        orderBy: { createdAt: 'desc' },
        select: { authorId: true },
      });
      if (lastMsg?.authorId === t.memberId) messagesNeedingReply += 1;
    }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { fullName: true },
  });
  if (!dbUser) redirect('/dashboard');

  const affiliation = counselor ? counselorAffiliationLabel(counselor.partner?.name) : 'WorkforceAP';

  const enrolledCount = assignments.filter((a) => a.member.enrolledProgram).length;
  const needsAttentionCount = assignments.filter((a) => !a.member.enrolledProgram && !a.member.programInterest).length;

  const metricCards = [
    { icon: 'groups', label: 'Total Members', value: assignments.length, trend: '+12%', trendColor: '#80d99f' },
    { icon: 'timer', label: 'Needs Reply', value: messagesNeedingReply, trend: messagesNeedingReply > 0 ? 'Action needed' : 'Clear', trendColor: messagesNeedingReply > 0 ? 'var(--color-accent)' : '#80d99f' },
    { icon: 'verified_user', label: 'Enrolled', value: enrolledCount, trend: `+${enrolledCount}`, trendColor: '#80d99f' },
    { icon: 'handshake', label: 'Needs Attention', value: needsAttentionCount, trend: `Target: 0`, trendColor: 'var(--color-on-surface)' },
  ];

  return (
    <div style={{ maxWidth: '76rem', margin: '0 auto' }}>
      {/* ── Header Section ── */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.5rem' }}>
        <div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(173,44,77,0.6)' }}>Dashboard</span>
            <span className="material-symbols-outlined" style={{ fontSize: '0.625rem', color: 'rgba(173,44,77,0.4)' }}>chevron_right</span>
            <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(173,44,77,0.6)' }}>Cohort Management</span>
          </nav>
          <h1 className="text-display-sm" style={{ color: 'var(--color-on-surface)' }}>
            Active Cohorts <span style={{ color: 'var(--color-accent)' }}>Overview</span>
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.125rem', maxWidth: '42rem', lineHeight: 1.6, marginTop: '0.5rem' }}>
            {affiliation} &middot; Tracking progress for {assignments.length} active member{assignments.length === 1 ? '' : 's'}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/counselor/resources" style={{ padding: '0.75rem 1.5rem', background: 'var(--surface-container-high)', color: 'var(--color-accent)', fontWeight: 600, borderRadius: '0.5rem', fontSize: '0.875rem', textDecoration: 'none' }}>
            Resources
          </Link>
          <Link href="/counselor/messages" style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(to right, var(--color-accent), rgba(173,44,77,0.7))', color: '#fff', fontWeight: 600, borderRadius: '0.5rem', fontSize: '0.875rem', textDecoration: 'none', boxShadow: '0 4px 16px rgba(173,44,77,0.2)' }}>
            Messages
          </Link>
        </div>
      </header>

      {/* ── Metrics Bento ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {metricCards.map((card) => (
          <div key={card.label} className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }}>{card.icon}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: card.trendColor }}>{card.trend}</span>
            </div>
            <p className="metric-value">{card.value}</p>
            <p className="metric-label">{card.label}</p>
          </div>
        ))}
      </section>

      {/* ── Main Content Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

        {/* ── Left: Member Activity List ── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-on-surface)' }}>
              Your Students ({assignments.length})
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={{ padding: '0.5rem', background: 'var(--surface-container)', borderRadius: '0.5rem', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>filter_list</span>
              </button>
              <button style={{ padding: '0.5rem', background: 'var(--surface-container)', borderRadius: '0.5rem', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>sort</span>
              </button>
            </div>
          </div>

          {assignments.length === 0 ? (
            <div className="stitch-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--color-on-surface-variant)' }}>
                No students assigned yet. Administrators assign members to you from the admin workspace.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {assignments.map((assignment) => {
                const isEnrolled = !!assignment.member.enrolledProgram;
                const initials = (assignment.member.fullName ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <Link
                    key={assignment.id}
                    href={`/counselor/students/${assignment.member.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="stitch-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', transition: 'background-color 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '3rem', height: '3rem', borderRadius: '0.5rem',
                          background: 'var(--surface-container-highest)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-accent)',
                        }}>
                          {initials}
                        </div>
                        <div>
                          <h4 style={{ fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.125rem' }}>
                            {assignment.member.fullName}
                          </h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>
                            {assignment.member.programInterest || 'No program specified'} &middot; {assignment.member.email}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: isEnrolled ? 'rgba(128,217,159,0.1)' : 'rgba(173,44,77,0.1)',
                          color: isEnrolled ? '#80d99f' : 'var(--color-accent)',
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderRadius: '9999px',
                          border: `1px solid ${isEnrolled ? 'rgba(128,217,159,0.2)' : 'rgba(173,44,77,0.2)'}`,
                        }}>
                          {isEnrolled ? 'Enrolled' : 'Not enrolled'}
                        </span>
                        <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.4 }}>more_vert</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Right Sidebar ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Coaching Sessions placeholder */}
          <section>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1.5rem', color: 'var(--color-on-surface)' }}>Quick Actions</h3>
            <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ padding: '0.5rem', background: 'rgba(173,44,77,0.1)', borderRadius: '0.25rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: 'var(--color-accent)' }}>forum</span>
                  </div>
                  <div>
                    <p className="text-label-upper" style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Messages</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                      {messagesNeedingReply} thread{messagesNeedingReply === 1 ? '' : 's'} awaiting reply
                    </p>
                  </div>
                </div>
                <Link href="/counselor/messages" style={{
                  display: 'block', width: '100%', marginTop: '1rem',
                  padding: '0.5rem', textAlign: 'center',
                  background: 'var(--color-accent)', color: '#fff',
                  borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                  textDecoration: 'none',
                }}>
                  Open Messages
                </Link>
              </div>
              <div style={{ padding: '1.25rem', opacity: 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ padding: '0.5rem', background: 'var(--surface-container-highest)', borderRadius: '0.25rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>people</span>
                  </div>
                  <div>
                    <p className="text-label-upper" style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Students</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                      View all student profiles
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Counselor Actions / Notifications */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-on-surface)' }}>Counselor Actions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {needsAttentionCount > 0 && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', marginTop: '0.375rem', borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-on-surface)' }}>
                      <strong>{needsAttentionCount} student{needsAttentionCount === 1 ? '' : 's'}</strong> need{needsAttentionCount === 1 ? 's' : ''} program guidance
                    </p>
                    <p style={{ fontSize: '0.625rem', color: 'var(--color-on-surface-variant)', fontWeight: 700, marginTop: '0.25rem' }}>ACTION REQUIRED</p>
                  </div>
                </div>
              )}
              {messagesNeedingReply > 0 && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', marginTop: '0.375rem', borderRadius: '50%', background: '#80d99f', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-on-surface)' }}>
                      <strong>{messagesNeedingReply} message thread{messagesNeedingReply === 1 ? '' : 's'}</strong> waiting for your reply
                    </p>
                    <p style={{ fontSize: '0.625rem', color: 'var(--color-on-surface-variant)', fontWeight: 700, marginTop: '0.25rem' }}>RESPOND SOON</p>
                  </div>
                </div>
              )}
              {needsAttentionCount === 0 && messagesNeedingReply === 0 && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', opacity: 0.5 }}>
                  <div style={{ width: '8px', height: '8px', marginTop: '0.375rem', borderRadius: '50%', background: 'var(--outline-variant)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-on-surface)' }}>
                      All caught up. No actions pending.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
