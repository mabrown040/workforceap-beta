import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { getTranslations } from 'next-intl/server';
import CounselorStudentsRosterClient from '@/components/portal/counselor/CounselorStudentsRosterClient';
import { loadCounselorRosterRiskAndActivity } from '@/lib/counselor/counselorStudentsRoster';

const HOT_QUEUE_LOOKBACK_DAYS = 7;

function formatHotQueueTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  return `${diffDays}d ago`;
}

export default async function CounselorStudentsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/students');

  if (!(await isCounselor(user.id)) && !(await isAdmin(user.id))) redirect('/dashboard');

  const counselor = await prisma.counselor.findFirst({
    where: { userId: user.id, active: true },
  });
  if (!counselor && !(await isAdmin(user.id))) redirect('/dashboard');

  const t = await getTranslations('counselor');

  const assignments = counselor
    ? await prisma.counselorAssignment.findMany({
        where: { counselor: { userId: user.id, active: true }, active: true },
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              email: true,
              enrolledProgram: true,
              programInterest: true,
              assessmentScorePct: true,
              wioaReviewStatus: true,
              createdAt: true,
              memberProgramProgress: {
                select: { programSlug: true, averagePercent: true, coursesCompleted: true },
              },
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      })
    : [];

  const activeCount = assignments.length;
  const enrolledCount = assignments.filter((a) => a.member.enrolledProgram).length;
  const memberIds = assignments.map((a) => a.memberId);

  const activityRiskByMember = await loadCounselorRosterRiskAndActivity(memberIds);

  /** Oldest platform activity first — prioritize follow-up for dormant members. */
  const rosterAssignments = [...assignments].sort((a, b) => {
    const ta = activityRiskByMember.get(a.memberId)?.lastActivityAt.getTime() ?? 0;
    const tb = activityRiskByMember.get(b.memberId)?.lastActivityAt.getTime() ?? 0;
    return ta - tb;
  });

  const rosterRows = rosterAssignments.map((a) => {
    const meta = activityRiskByMember.get(a.memberId);
    return {
      assignmentId: a.id,
      memberId: a.member.id,
      fullName: a.member.fullName,
      email: a.member.email,
      enrolledProgram: a.member.enrolledProgram,
      programInterest: a.member.programInterest,
      assessmentScorePct: a.member.assessmentScorePct,
      wioaReviewStatus: a.member.wioaReviewStatus,
      memberProgramProgress: a.member.memberProgramProgress,
      riskScore: meta?.riskScore ?? null,
      riskLevel: meta?.riskLevel ?? 'LOW',
      lastActivityAt: (meta?.lastActivityAt ?? a.member.createdAt).toISOString(),
    };
  });
  const hotQueueCutoff = new Date(Date.now() - HOT_QUEUE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const hotQueue = memberIds.length
    ? await prisma.memberNextBestAction.findMany({
        where: {
          memberId: { in: memberIds },
          status: 'PENDING',
          icon: 'auto_awesome',
          createdAt: { gte: hotQueueCutoff },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          memberId: true,
          title: true,
          description: true,
          ctaLabel: true,
          ctaHref: true,
          createdAt: true,
          member: {
            select: {
              id: true,
              fullName: true,
              enrolledProgram: true,
              programInterest: true,
            },
          },
        },
      })
    : [];

  return (
    <PortalPageFrame>
      <PageHeader title={t('myMembersTitle')} subtitle={t('membersAssignedForCoaching')} />
      {/* ── Mobile ─────────────────────────────────────────── */}
      <div className="md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Stats row */}
        <div
          style={{
            display: 'flex', flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '1rem 1rem 0',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { label: t('activeMembers'), value: activeCount, accent: 'var(--color-accent)' },
            { label: t('enrolled'), value: enrolledCount, accent: 'var(--color-gold)' },
            { label: t('hotMemberQueue'), value: hotQueue.length, accent: 'var(--color-amber)' },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              style={{
                flexShrink: 0,
                background: 'var(--surface-container-low)',
                borderRadius: '0.75rem',
                padding: '0.875rem 1.125rem',
                minWidth: '110px',
              }}
            >
              <p
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--color-on-surface-variant)',
                  margin: '0 0 0.25rem',
                }}
              >
                {label}
              </p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: accent, margin: 0, lineHeight: 1 }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* TODO: Add real filter chips (At Risk, Upcoming Session) when
             student list is converted to a client component with filter state.
             Removed non-functional decorative chips that looked clickable. */}

        {hotQueue.length > 0 ? (
          <div style={{ padding: '1rem 1rem 0' }}>
            <div
              style={{
                background: 'var(--color-amber-light)',
                border: '1px solid color-mix(in srgb, var(--color-amber) 40%, transparent)',
                borderRadius: '1rem',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-amber)' }}>
                    Hot member queue
                  </p>
                  <h2 style={{ margin: '0.2rem 0 0', fontSize: '1rem', fontWeight: 800, color: 'var(--color-amber)' }}>
                    Fresh completions that need counselor follow-up
                  </h2>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-amber)', fontSize: 24 }} aria-hidden="true">local_fire_department</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {hotQueue.map((action) => (
                  <Link
                    key={action.id}
                    href={`/counselor/students/${action.memberId}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.9)',
                        borderRadius: '0.875rem',
                        border: '1px solid color-mix(in srgb, var(--color-amber) 15%, transparent)',
                        padding: '0.875rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                          {action.member.fullName ?? t('member')}
                        </p>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-amber)', whiteSpace: 'nowrap' }}>
                          {formatHotQueueTime(action.createdAt)}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-amber)' }}>{action.title}</p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>{action.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {assignments.length === 0 ? (
          <div style={{ padding: '0 1rem' }}>
            <PortalEmptyState
              title={t('noMembersAssignedYet')}
              description={t('membersAppearOnceAssigned')}
              icon={<span className="material-symbols-outlined" aria-hidden="true">person_search</span>}
              primaryAction={{ label: t('openMessages'), href: '/counselor/messages' }}
              secondaryAction={{ label: t('counselorGuide'), href: '/counselor/guide' }}
            />
          </div>
        ) : (
          <CounselorStudentsRosterClient rows={rosterRows} />
        )}
      </div>

      {/* ── Desktop ─────────────────────────────────────────── */}
      <div className="wa-hidden md:wa-block">
        {hotQueue.length > 0 ? (
          <section style={{ marginBottom: '1.5rem' }}>
            <div
              className="portal-card portal-card--flat"
              style={{
                padding: '1.25rem',
                border: '1px solid color-mix(in srgb, var(--color-amber) 40%, transparent)',
                background: 'linear-gradient(180deg, var(--color-amber-light) 0%, #ffffff 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.875rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-amber)' }}>
                    Hot member queue
                  </p>
                  <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-amber)' }}>
                    Members who just became actionable
                  </h2>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-amber)', fontSize: 28 }} aria-hidden="true">local_fire_department</span>
              </div>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {hotQueue.map((action) => (
                  <Link
                    key={action.id}
                    href={`/counselor/students/${action.memberId}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: '1rem',
                      alignItems: 'center',
                      textDecoration: 'none',
                      border: '1px solid color-mix(in srgb, var(--color-amber) 15%, transparent)',
                      borderRadius: '0.9rem',
                      padding: '0.9rem 1rem',
                      background: '#fff',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: '0 0 0.2rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
                        {action.member.fullName ?? t('member')}
                      </p>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-amber)' }}>{action.title}</p>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-on-surface-variant)' }}>{action.description}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-amber)' }}>
                        {formatHotQueueTime(action.createdAt)}
                      </p>
                      <span className="btn btn-primary btn-sm">{t('openMember')}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {assignments.length === 0 ? (
          <PortalEmptyState
            title={t('noMembersAssignedYet')}
            description={t('membersAppearOnceAssigned')}
            icon={<span className="material-symbols-outlined" aria-hidden="true">person_search</span>}
            primaryAction={{ label: t('openMessages'), href: '/counselor/messages' }}
            secondaryAction={{ label: t('counselorGuide'), href: '/counselor/guide' }}
          />
        ) : (
          <CounselorStudentsRosterClient rows={rosterRows} />
        )}
      </div>

      <MobileBottomNav variant="counselor" />
    </PortalPageFrame>
  );
}
