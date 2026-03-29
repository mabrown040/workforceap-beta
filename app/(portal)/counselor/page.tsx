import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { counselorAffiliationLabel } from '@/lib/counselor/counselorLabels';
import MobileBottomNav from '@/components/MobileBottomNav';

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

  const firstName = (dbUser.fullName ?? 'Counselor').split(' ')[0];

  const statCards = [
    { icon: 'groups', label: 'Active Students', value: assignments.length, bg: 'rgba(173,44,77,0.1)', iconColor: 'var(--color-accent)' },
    { icon: 'mark_email_unread', label: 'Unread Messages', value: messagesNeedingReply, bg: 'rgba(59,130,246,0.1)', iconColor: '#3b82f6' },
    { icon: 'school', label: 'Enrolled Modules', value: enrolledCount, bg: 'rgba(128,217,159,0.1)', iconColor: '#80d99f' },
    { icon: 'warning', label: 'Needs Attention', value: needsAttentionCount, bg: 'rgba(251,191,36,0.1)', iconColor: '#fbbf24' },
  ];

  return (
    <div style={{ maxWidth: '76rem', margin: '0 auto' }}>
      {/* ── Mobile Counselor View (≤640px) ── */}
      <div className="block md:hidden pb-24">
        {/* Hero */}
        <div className="px-6 pt-6 pb-2">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[#8c0f37] mb-2">Academic Overview</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface leading-tight">
            Morning,<br /><span style={{ color: '#ad2c4d' }}>Counselor</span>
          </h2>
        </div>
        {/* Stats grid */}
        <div className="px-6 mt-4 grid grid-cols-2 gap-4 mb-6">
          <div className="col-span-2 rounded-xl p-5 text-white relative overflow-hidden"
            style={{ background: '#ad2c4d' }}>
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Active Students</p>
              <p className="text-4xl font-bold tracking-tighter">{assignments.length}</p>
            </div>
            <span className="material-symbols-outlined absolute -right-2 -bottom-2 opacity-10"
              style={{ fontSize: '100px' }}>group</span>
          </div>
          <div className="bg-surface-container-low rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Enrolled</p>
            <p className="text-2xl font-bold text-on-surface">{enrolledCount}</p>
            <div className="mt-2 w-8 h-1 rounded-full" style={{ background: '#7b5800' }} />
          </div>
          <div className="bg-surface-container-low rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Messages</p>
            <p className="text-2xl font-bold text-on-surface">{messagesNeedingReply}</p>
            <div className="mt-2 w-8 h-1 rounded-full" style={{ background: '#8c0f37' }} />
          </div>
        </div>
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto px-6 pb-3 hide-scrollbar">
          {['All', 'At Risk', 'Upcoming Session', 'New'].map((f, i) => (
            <span key={f} className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer"
              style={i === 0 ? { background: '#8c0f37', color: '#fff' } : { background: 'var(--surface-container-highest)', color: 'var(--on-surface)' }}>
              {f}
            </span>
          ))}
        </div>
        {/* Student roster */}
        <div className="px-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold tracking-tight">Active Roster</h3>
            <span className="material-symbols-outlined text-on-surface-variant text-xl">sort</span>
          </div>
          <div className="space-y-3">
            {assignments.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center">
                <p className="text-sm text-on-surface-variant">No students assigned yet.</p>
              </div>
            ) : (
              assignments.map((a) => {
                const prog = a.member.enrolledProgram ?? a.member.programInterest ?? 'Unknown Program';
                const isEnrolled = !!a.member.enrolledProgram;
                const hasInterest = !!a.member.programInterest;
                const progressPct = isEnrolled ? 100 : hasInterest ? 50 : 0;
                const statusLabel = isEnrolled ? 'On Track' : 'At Risk';
                const statusStyle = isEnrolled
                  ? { background: '#dcfce7', color: '#166534' }
                  : { background: '#fee2e2', color: '#991b1b' };
                return (
                  <Link key={a.id} href={`/counselor/students/${a.memberId}`}
                    className="bg-white rounded-xl p-4 flex items-center gap-3 no-underline active:scale-[0.98] transition-all">
                    <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-on-surface text-base truncate">{a.member.fullName}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 truncate" style={{ color: '#ad2c4d' }}>{prog}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-surface-container rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: '#ad2c4d' }} />
                        </div>
                        <span className="text-[10px] font-bold text-on-surface-variant">{progressPct}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider"
                        style={statusStyle}>{statusLabel}</span>
                      <span className="material-symbols-outlined text-surface-container-highest">chevron_right</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
        <MobileBottomNav variant="portal" />
      </div>
      {/* ── Desktop View ── */}
      <div className="wa-hidden wa-md:block">
      {/* ── Welcome Header ── */}
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>
          Welcome back, {firstName}.
        </h1>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1rem', lineHeight: 1.6 }}>
          Your academic oversight panel is synchronized
        </p>
      </header>

      {/* ── Stat Cards ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {statCards.map((card) => (
          <div
            key={card.label}
            className="stitch-card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              transition: 'transform 0.15s, box-shadow 0.15s',
              cursor: 'default',
            }}
          >
            <div style={{
              width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem',
              background: card.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: card.iconColor }}>{card.icon}</span>
            </div>
            <div>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)', lineHeight: 1 }}>{card.value}</p>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Main Content Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

        {/* ── Left Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Your Students */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-on-surface)' }}>
                Your Students
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
              <div className="stitch-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <div style={{
                  width: '4rem', height: '4rem', borderRadius: '50%',
                  background: 'var(--surface-container-highest)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: 'var(--color-on-surface-variant)' }}>person_search</span>
                </div>
                <p style={{ fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.5rem', fontSize: '1rem' }}>
                  No students assigned yet
                </p>
                <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: '24rem', margin: '0 auto 1.5rem' }}>
                  Students will appear here once assigned by an administrator.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <Link href="/counselor/resources" style={{
                    padding: '0.625rem 1.25rem',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    fontWeight: 600,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                  }}>
                    Import Cohort
                  </Link>
                  <Link href="/counselor/messages" style={{
                    padding: '0.625rem 1.25rem',
                    background: 'var(--surface-container-high)',
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                  }}>
                    Browse Directory
                  </Link>
                </div>
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

          {/* System Diagnostics */}
          <section>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1.25rem', color: 'var(--color-on-surface)' }}>
              System Diagnostics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="stitch-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Curriculum Sync Status</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>{affiliation}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#80d99f', background: 'rgba(128,217,159,0.1)', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>Healthy</span>
                </div>
              </div>
              <div className="stitch-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>AI Teaching Assistant</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>GPT Integration</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#80d99f', background: 'rgba(128,217,159,0.1)', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>Operational</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── Right Sidebar ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Quick Insights */}
          <section className="stitch-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>Quick Insights</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>Active students</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{assignments.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>Enrolled in modules</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#80d99f' }}>{enrolledCount}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>Awaiting reply</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: messagesNeedingReply > 0 ? 'var(--color-accent)' : 'var(--color-on-surface)' }}>{messagesNeedingReply}</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(226,226,229,0.08)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                <Link href="/counselor/messages" style={{
                  display: 'block', width: '100%',
                  padding: '0.625rem', textAlign: 'center',
                  background: 'var(--color-accent)', color: '#fff',
                  borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                  textDecoration: 'none',
                }}>
                  Open Messages
                </Link>
              </div>
            </div>
          </section>

          {/* Upcoming Events */}
          <section>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>Upcoming Events</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { day: '02', month: 'Apr', title: 'Cohort Check-in', desc: 'Weekly sync with all active students' },
                { day: '08', month: 'Apr', title: 'Module Reviews Due', desc: 'Assess enrolled module progress' },
                { day: '15', month: 'Apr', title: 'Partner Meeting', desc: `${affiliation} quarterly review` },
              ].map((ev) => (
                <div key={ev.title} className="stitch-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '3rem', minWidth: '3rem', textAlign: 'center',
                    background: 'var(--surface-container-highest)', borderRadius: '0.5rem', padding: '0.5rem 0',
                  }}>
                    <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-accent)', lineHeight: 1 }}>{ev.day}</p>
                    <p style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)' }}>{ev.month}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>{ev.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{ev.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Counselor Actions */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Counselor Actions</h3>
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
      </div>{/* end desktop */}
    </div>
  );
}
