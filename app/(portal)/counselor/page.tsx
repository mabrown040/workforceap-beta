import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { counselorAffiliationLabel } from '@/lib/counselor/counselorLabels';
import MobileBottomNav from '@/components/MobileBottomNav';
import CounselorPortalVoiceBlock from '@/components/portal/CounselorPortalVoiceBlock';
import { counselorStudentStatusBadge } from '@/lib/counselor/memberStatus';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import { getTimeOfDayGreeting } from '@/lib/time/greeting';

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
              assessmentScorePct: true,
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
  const greeting = getTimeOfDayGreeting();

  const statCards = [
    { icon: 'groups', label: 'Active Students', value: assignments.length, bg: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', iconColor: 'var(--color-accent)' },
    { icon: 'mark_email_unread', label: 'Unread Messages', value: messagesNeedingReply, bg: 'rgba(59,130,246,0.1)', iconColor: '#3b82f6' },
    { icon: 'school', label: 'Enrolled Modules', value: enrolledCount, bg: 'rgba(128,217,159,0.1)', iconColor: '#80d99f' },
    { icon: 'warning', label: 'Needs Attention', value: needsAttentionCount, bg: 'rgba(251,191,36,0.1)', iconColor: '#fbbf24' },
  ];

  return (
    <PortalPageFrame maxWidth="76rem">
      <h1 className="wa-sr-only">Counselor Dashboard - Welcome back, {firstName}</h1>
      {/* ── Mobile Counselor View (≤640px) ── */}
      <div className="wa-block wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Hero */}
        <div style={{ paddingLeft:"1.5rem", paddingRight:"1.5rem", paddingTop:"1.5rem", paddingBottom:"0.5rem" }}>
          <p className="wa-text-[10px] wa-uppercase wa-tracking-[0.15em] wa-font-semibold wa-text-[#8c0f37]" style={{ marginBottom:"0.5rem" }}>Academic Overview</p>
          <h2 className="wa-text-3xl wa-font-extrabold wa-tracking-tight text-on-surface wa-leading-tight">
            {greeting},<br /><span style={{ color: 'var(--color-accent)' }}>{firstName}</span>
          </h2>
        </div>
        <div style={{ marginLeft: '1.5rem', marginRight: '1.5rem', marginBottom: '1rem' }}>
          <CounselorPortalVoiceBlock />
        </div>
        {/* Stats grid */}
        <div style={{ paddingLeft:"1.5rem", paddingRight:"1.5rem", marginTop:"1rem", display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:"1rem", marginBottom:"1.5rem" }}>
          <div className="wa-text-white" style={{gridColumn:"span 2", borderRadius:"0.75rem", padding:"1.25rem", position:"relative", overflow:"hidden", background: 'var(--color-accent)'}}>
            <div style={{ position:"relative", zIndex:10 }}>
              <p className="wa-text-[10px] wa-uppercase wa-tracking-widest" style={{ opacity:0.8, marginBottom:"0.25rem" }}>Active Students</p>
              <p className="wa-text-4xl wa-font-bold wa-tracking-tighter">{assignments.length}</p>
            </div>
            <span className="material-symbols-outlined -wa-right-2 -wa-bottom-2" style={{position:"absolute", opacity:0.1, fontSize: '100px'}}>group</span>
          </div>
          <div className="bg-surface-container-low" style={{ borderRadius:"0.75rem", padding:"1rem" }}>
            <p className="wa-text-[10px] wa-uppercase wa-tracking-widest text-on-surface-variant" style={{ marginBottom:"0.25rem" }}>Enrolled</p>
            <p className="wa-text-2xl wa-font-bold text-on-surface">{enrolledCount}</p>
            <div style={{marginTop:"0.5rem", width:"2rem", height:"0.25rem", borderRadius:"9999px", background: 'var(--color-gold)'}} />
          </div>
          <div className="bg-surface-container-low" style={{ borderRadius:"0.75rem", padding:"1rem" }}>
            <p className="wa-text-[10px] wa-uppercase wa-tracking-widest text-on-surface-variant" style={{ marginBottom:"0.25rem" }}>Messages</p>
            <p className="wa-text-2xl wa-font-bold text-on-surface">{messagesNeedingReply}</p>
            <div style={{marginTop:"0.5rem", width:"2rem", height:"0.25rem", borderRadius:"9999px", background: 'var(--color-accent)'}} />
          </div>
        </div>
        {/* Filter chips */}
        <div style={{ display:"flex", gap:"0.5rem", overflowX:"auto", scrollbarWidth:"none", paddingLeft:"1.5rem", paddingRight:"1.5rem", paddingBottom:"0.75rem" }}>
          {['All', 'At Risk', 'Upcoming Session', 'New'].map((f, i) => (
            <span key={f} className="wa-text-xs wa-font-semibold" style={Object.assign({ flexShrink:0, paddingLeft:"1rem", paddingRight:"1rem", paddingTop:"0.5rem", paddingBottom:"0.5rem", borderRadius:"9999px", cursor:"pointer" }, i === 0 ? { background: 'var(--color-accent)', color: '#fff' } : { background: 'var(--surface-container-highest)', color: 'var(--on-surface)' })}>
              {f}
            </span>
          ))}
        </div>
        {/* Student roster */}
        <div style={{ paddingLeft:"1.5rem", paddingRight:"1.5rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
            <h3 className="wa-text-lg wa-font-bold wa-tracking-tight">Active Roster</h3>
            <span className="material-symbols-outlined text-on-surface-variant wa-text-xl">sort</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            {assignments.length === 0 ? (
              <div className="wa-bg-white" style={{ borderRadius:"0.75rem", padding:"1.5rem", textAlign:"center" }}>
                <p className="wa-text-sm text-on-surface-variant" style={{ marginBottom: '0.75rem' }}>
                  No students assigned yet. Ask your admin to assign members to you.
                </p>
                <a
                  href="mailto:info@workforceap.org?subject=Student%20assignments%20for%20counselor%20portal"
                  className="wa-text-sm wa-font-semibold"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Email WorkforceAP
                </a>
              </div>
            ) : (
              assignments.map((a) => {
                const prog = a.member.enrolledProgram ?? a.member.programInterest ?? 'Unknown Program';
                const isEnrolled = !!a.member.enrolledProgram;
                const hasInterest = !!a.member.programInterest;
                const progressPct = isEnrolled ? 100 : hasInterest ? 50 : 0;
                const rosterBadge = counselorStudentStatusBadge({
                  enrolledProgram: a.member.enrolledProgram,
                  assessmentScorePct: a.member.assessmentScorePct,
                });
                const statusLabel = rosterBadge.label;
                const statusStyle = rosterBadge.style;
                return (
                  <Link key={a.id} href={`/counselor/students/${a.memberId}`}
                    className="wa-bg-white active:scale-[0.98] wa-transition-all" style={{ borderRadius:"0.75rem", padding:"1rem", display:"flex", alignItems:"center", gap:"0.75rem", textDecoration:"none" }}>
                    <div className="bg-surface-container-high" style={{ width:"3rem", height:"3rem", borderRadius:"0.75rem", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span className="material-symbols-outlined text-on-surface-variant">person</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <h4 className="wa-font-bold text-on-surface wa-text-base wa-truncate">{a.member.fullName}</h4>
                      <p className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-wider wa-truncate" style={{marginBottom:"0.25rem", color: 'var(--color-accent)'}}>{prog}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                        <div className="bg-surface-container" style={{ flex:1, height:"0.25rem", borderRadius:"9999px", overflow:"hidden" }}>
                          <div style={{height:"100%", borderRadius:"9999px", width: `${progressPct}%`, background: 'var(--color-accent)'}} />
                        </div>
                        <span className="wa-text-[10px] wa-font-bold text-on-surface-variant">{progressPct}%</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"0.5rem" }}>
                      <span className="wa-text-[9px] wa-font-bold wa-uppercase wa-tracking-wider" style={Object.assign({ paddingLeft:"0.5rem", paddingRight:"0.5rem", paddingTop:"0.125rem", paddingBottom:"0.125rem", borderRadius:"0.25rem" }, statusStyle)}>{statusLabel}</span>
                      <span className="material-symbols-outlined text-surface-container-highest">chevron_right</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
        <MobileBottomNav variant="counselor" />
      </div>
      {/* ── Desktop View ── */}
      <div className="wa-hidden wa-md:wa-block">
      {/* ── Welcome Header ── */}
      <PageHeader
        title={`Welcome back, ${firstName}.`}
        subtitle="Your academic oversight panel is synchronized"
      />

      <section style={{ marginBottom: '2.5rem' }}>
        <CounselorPortalVoiceBlock />
      </section>

      {/* ── Stat Cards ── */}
      <section className="portal-grid-metrics" style={{ marginBottom: '2.5rem' }}>
        {statCards.map((card) => (
          <div
            key={card.label}
            className="stitch-card stitch-card--padded"
            style={{
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>

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
              <PortalEmptyState
                title="No students assigned yet"
                description="Students will appear here once assigned by an administrator."
                icon={<span className="material-symbols-outlined">person_search</span>}
                primaryAction={{ label: 'Contact admin for assignments', href: 'mailto:info@workforceap.org?subject=Student%20assignments%20for%20counselor%20portal' }}
                secondaryAction={{ label: 'Counselor resources', href: '/counselor/resources' }}
              />
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
                      <div className="stitch-card stitch-card--padded" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background-color 0.15s' }}>
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
                            background: isEnrolled ? 'rgba(128,217,159,0.1)' : 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
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
              <div className="stitch-card stitch-card--padded">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Curriculum Sync Status</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>{affiliation}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#80d99f', background: 'rgba(128,217,159,0.1)', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>Healthy</span>
                </div>
              </div>
              <div className="stitch-card stitch-card--padded">
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
          <section className="stitch-card stitch-card--padded">
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
                <div key={ev.title} className="stitch-card stitch-card--padded-sm" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
    </PortalPageFrame>
  );
}
