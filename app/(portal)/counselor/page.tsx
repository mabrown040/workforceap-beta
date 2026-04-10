import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { counselorAffiliationLabel } from '@/lib/counselor/counselorLabels';
import MobileBottomNav from '@/components/MobileBottomNav';
import CounselorPortalVoiceBlock from '@/components/portal/CounselorPortalVoiceBlock';
import { counselorStudentStatusBadge, counselorStudentStatusBadgeVariant } from '@/lib/counselor/memberStatus';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import PortalStatCard from '@/components/portal/PortalStatCard';
import StatusBadge from '@/components/portal/StatusBadge';
import { getTimeOfDayGreeting } from '@/lib/time/greeting';
import { getProgramBySlug } from '@/lib/content/programs';
import PortalCard from '@/components/portal/ui/PortalCard';

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
              coursesCompleted: true,
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
    { icon: 'groups', label: 'Your Students', value: assignments.length, bg: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', iconColor: 'var(--color-accent)' },
    { icon: 'mark_email_unread', label: 'Awaiting Reply', value: messagesNeedingReply, bg: 'color-mix(in srgb, var(--color-blue) 12%, transparent)', iconColor: 'var(--color-blue)' },
    { icon: 'school', label: 'In a Program', value: enrolledCount, bg: 'color-mix(in srgb, var(--color-green) 12%, transparent)', iconColor: 'var(--color-green)' },
    { icon: 'warning', label: 'No Program Yet', value: needsAttentionCount, bg: 'color-mix(in srgb, var(--color-gold) 14%, transparent)', iconColor: 'var(--color-gold)' },
  ];

  return (
    <PortalPageFrame maxWidth="76rem">
      <h1 className="wa-sr-only">Counselor Dashboard - Welcome back, {firstName}</h1>
      {/* ── Mobile Counselor View (≤640px) ── */}
      <div className="wa-block wa-md:wa-hidden portal-mobile-content">
        {/* Hero */}
        <div className="portal-pad-x" style={{ paddingTop:"1.5rem", paddingBottom:"0.5rem" }}>
          <p className="wa-text-[11px] wa-uppercase wa-tracking-[0.12em] wa-font-semibold" style={{ color: 'var(--color-accent)', marginBottom:"0.5rem" }}>Counselor Dashboard</p>
          <h2 className="wa-text-3xl wa-font-extrabold wa-tracking-tight text-on-surface wa-leading-tight">
            {greeting},<br /><span style={{ color: 'var(--color-accent)' }}>{firstName}</span>
          </h2>
        </div>
        <div className="portal-pad-x" style={{ marginBottom: '1rem' }}>
          <details className="portal-card portal-card--compact">
            <summary className="portal-card__summary">
              Counselor assistant
              <span className="portal-card__summary-hint">(tap to open)</span>
            </summary>
            <div className="portal-card__body">
              <CounselorPortalVoiceBlock />
            </div>
          </details>
        </div>
        {/* Stats grid */}
        <div className="portal-pad-x" style={{ marginTop:"1rem", display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:"1rem", marginBottom:"1.5rem" }}>
          <div className="wa-text-white" style={{gridColumn:"span 2", borderRadius:"0.75rem", padding:"1.25rem", position:"relative", overflow:"hidden", background: 'var(--color-accent)'}}>
            <div style={{ position:"relative", zIndex:10 }}>
              <p className="wa-text-[11px] wa-uppercase wa-tracking-widest" style={{ opacity:0.85, marginBottom:"0.25rem" }}>Your Students</p>
              <p className="wa-text-4xl wa-font-bold wa-tracking-tighter">{assignments.length}</p>
            </div>
            <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: '-1rem', right: '-1rem', fontSize: '8rem', opacity: 0.07, color: '#fff', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">group</span>
          </div>
          <div className="portal-metric-card">
            <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--gold">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">school</span>
            </div>
            <p className="portal-metric-card__value" style={{ fontSize: '1.5rem' }}>{enrolledCount}</p>
            <p className="portal-metric-card__label">In a Program</p>
          </div>
          <div className="portal-metric-card">
            <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--accent">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">mark_email_unread</span>
            </div>
            <p className="portal-metric-card__value" style={{ fontSize: '1.5rem', color: messagesNeedingReply > 0 ? 'var(--color-accent)' : undefined }}>{messagesNeedingReply}</p>
            <p className="portal-metric-card__label">Awaiting Reply</p>
          </div>
        </div>
        {/* Student roster */}
        <div className="portal-pad-x">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
            <h3 className="wa-text-lg wa-font-bold wa-tracking-tight">Active Roster</h3>
            <span className="material-symbols-outlined text-on-surface-variant wa-text-xl" aria-hidden="true">sort</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            {assignments.length === 0 ? (
              <PortalEmptyState
                title="No students assigned yet"
                description="Students will appear here once assigned by an administrator. In the meantime, explore the counselor guide."
                icon={<span className="material-symbols-outlined" aria-hidden="true">person_search</span>}
                primaryAction={{ label: 'Counselor guide', href: '/counselor/guide' }}
                secondaryAction={{ label: 'Resources', href: '/counselor/resources' }}
              />
            ) : (
              assignments.map((a) => {
                const prog = a.member.enrolledProgram ?? a.member.programInterest ?? 'Unknown Program';
                const enrolledSlug = a.member.enrolledProgram ?? null;
                const program = enrolledSlug ? getProgramBySlug(enrolledSlug) : null;
                const completed = (a.member.coursesCompleted as string[] | null) ?? [];
                const completedSet = new Set(completed);
                const totalCourses = program?.courses.length ?? 0;
                const completedCount =
                  program && totalCourses > 0
                    ? program.courses.filter((c) => completedSet.has(c.slug)).length
                    : 0;
                const trainingProgressPct =
                  program && totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : null;
                const rosterBadge = counselorStudentStatusBadge({
                  enrolledProgram: a.member.enrolledProgram,
                  assessmentScorePct: a.member.assessmentScorePct,
                });
                const statusLabel = rosterBadge.label;
                const badgeVariant = counselorStudentStatusBadgeVariant({
                  enrolledProgram: a.member.enrolledProgram,
                  assessmentScorePct: a.member.assessmentScorePct,
                });
                return (
                  <Link
                    key={a.id}
                    href={`/counselor/students/${a.memberId}`}
                    className="portal-kpi-card active:scale-[0.98] wa-transition-all"
                    style={{
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      textDecoration: 'none',
                    }}
                  >
                    <div className="bg-surface-container-high" style={{ width:"3rem", height:"3rem", borderRadius:"0.75rem", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">person</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <h4 className="wa-font-bold text-on-surface wa-text-base wa-truncate">{a.member.fullName}</h4>
                      <p className="wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-wider wa-truncate" style={{marginBottom:"0.25rem", color: 'var(--color-accent)'}}>{prog}</p>
                      {trainingProgressPct === null ? (
                        <p className="wa-text-[11px] wa-font-semibold text-on-surface-variant" style={{ margin: 0 }}>
                          {enrolledSlug ? 'Training progress unavailable' : 'Not enrolled'}
                        </p>
                      ) : (
                        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                          <div className="bg-surface-container" style={{ flex:1, height:"0.25rem", borderRadius:"9999px", overflow:"hidden" }}>
                            <div style={{height:"100%", borderRadius:"9999px", width: `${trainingProgressPct}%`, background: 'var(--color-accent)'}} />
                          </div>
                          <span className="wa-text-[11px] wa-font-bold text-on-surface-variant">{trainingProgressPct}%</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"0.5rem" }}>
                      <StatusBadge label={statusLabel} variant={badgeVariant} />
                      <span className="material-symbols-outlined text-surface-container-highest" aria-hidden="true">chevron_right</span>
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
        subtitle="See your assigned students, track their progress, and respond to messages."
      />

      <section style={{ marginBottom: '2rem' }}>
        <CounselorPortalVoiceBlock />
      </section>

      {/* ── Stat Cards ── */}
      <section className="portal-metric-strip" style={{ marginBottom: '2rem' }}>
        {statCards.map((card) => (
          <div key={card.label} className="portal-metric-card">
            <div className="portal-metric-card__icon-wrap" style={{ background: card.bg }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: card.iconColor, fontVariationSettings: "'FILL' 1" }} aria-hidden="true">{card.icon}</span>
            </div>
            <p className="portal-metric-card__value" style={{ color: card.value > 0 && card.label === 'Awaiting Reply' ? 'var(--color-accent)' : undefined }}>{card.value}</p>
            <p className="portal-metric-card__label">{card.label}</p>
          </div>
        ))}
      </section>

      {/* ── Main Content Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>

        {/* ── Left Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Your Students */}
          <section>
            <div style={{ marginBottom: '1rem' }}>
              <h3 className="portal-section-heading" style={{ margin: 0 }}>
                Your Students
              </h3>
              <p className="portal-page-subtitle" style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
                Sorted by most recently assigned.
              </p>
            </div>

            {assignments.length === 0 ? (
              <PortalEmptyState
                title="No students assigned yet"
                description="Students will appear here once assigned by an administrator."
                icon={<span className="material-symbols-outlined" aria-hidden="true">person_search</span>}
                primaryAction={{ label: 'Contact admin for assignments', href: 'mailto:info@workforceap.org?subject=Student%20assignments%20for%20counselor%20portal' }}
                secondaryAction={{ label: 'Counselor resources', href: '/counselor/resources' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {assignments.map((assignment) => {
                  const isEnrolled = !!assignment.member.enrolledProgram;
                  const initials = (assignment.member.fullName ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <Link
                      key={assignment.id}
                      href={`/counselor/students/${assignment.member.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div className="portal-card portal-card--flat portal-card--padded-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background-color 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem',
                            background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.875rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                          }}>
                            {initials}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: '0 0 0.125rem' }}>
                              {assignment.member.fullName}
                            </h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {assignment.member.programInterest || 'No program'} · {assignment.member.email}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexShrink: 0 }}>
                          <StatusBadge
                            label={isEnrolled ? 'Enrolled' : 'Not enrolled'}
                            variant={isEnrolled ? 'success' : 'accent'}
                          />
                          <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.35, fontSize: '1rem' }} aria-hidden="true">chevron_right</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* System Status */}
          <section>
            <h3 className="portal-section-heading">
              System Status
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="portal-card portal-card--flat portal-card--padded-sm">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p className="portal-section-title" style={{ marginBottom: '0.25rem' }}>Data Sync</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>{affiliation}</p>
                  </div>
                  <StatusBadge label="Healthy" variant="success" />
                </div>
              </div>
              <div className="portal-card portal-card--flat portal-card--padded-sm">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p className="portal-section-title" style={{ marginBottom: '0.25rem' }}>AI Assistant</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>Available</p>
                  </div>
                  <StatusBadge label="Online" variant="success" />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── Right Sidebar ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Quick Insights */}
          <section className="portal-card portal-card--flat portal-card--padded">
            <h3 className="portal-section-title" style={{ marginBottom: '1.25rem' }}>Quick Insights</h3>
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
                <Link href="/counselor/messages" className="btn btn-primary btn-full-width" style={{ fontSize: '0.75rem' }}>
                  Open Messages
                </Link>
              </div>
            </div>
          </section>

          {/* Quick Links */}
          <section>
            <h3 className="portal-section-title" style={{ marginBottom: '1rem' }}>Quick Links</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { href: '/counselor/students', icon: 'groups', title: 'My Students', desc: 'View roster and student details', accent: 'accent' },
                { href: '/counselor/messages', icon: 'forum', title: 'Messages', desc: 'Reply to student threads', accent: 'blue' },
                { href: '/counselor/resources', icon: 'menu_book', title: 'Resources', desc: 'Guides and reference links', accent: 'gold' },
              ].map((link) => (
                <Link key={link.href} href={link.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="portal-card portal-card--flat portal-card--padded-sm" style={{ display: 'flex', alignItems: 'center', gap: '1rem', transition: 'background-color 0.15s' }}>
                    <div style={{
                      width: '2.75rem', minWidth: '2.75rem', height: '2.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', borderRadius: '0.625rem',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-accent)', '--ms-fill': 1 }}>{link.icon}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>{link.title}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{link.desc}</p>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="portal-quick-action-item__label">{link.title}</p>
                    <p className="portal-quick-action-item__desc">{link.desc}</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', opacity: 0.3, flexShrink: 0 }} aria-hidden="true">chevron_right</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Counselor Actions */}
          <section>
            <h3 className="portal-section-title" style={{ marginBottom: '1.25rem' }}>Counselor Actions</h3>
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
