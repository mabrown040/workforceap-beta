import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import PageHeader from '@/components/portal/PageHeader';
import { getMemberPoints } from '@/lib/member/points';
import ReferralShareCard from './ReferralShareCard';
import {
  EVENT_LABELS,
  LEVELS,
  POINT_VALUES,
  getLevelForPoints,
  getNextLevel,
} from '@/lib/member/pointsConfig';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('pointsMetaTitle'),
    description: t('pointsMetaDesc'),
    path: '/dashboard/points',
  });
}

const LEVEL_ICONS: Record<string, string> = {
  starter: 'sprout',
  builder: 'build',
  achiever: 'star',
  champion: 'emoji_events',
};

/**
 * Static catalogue of earnable actions sourced from `lib/member/pointsConfig`.
 * Each entry maps an event key to a member-facing destination so the page can
 * link directly to the action that earns the points.
 */
const EARN_ACTIONS: Array<{
  event: keyof typeof POINT_VALUES;
  href: string | null;
  blurb: string;
}> = [
  {
    event: 'placement_recorded',
    href: '/dashboard/jobs',
    blurb: 'Confirmed by your counselor when you start a new role.',
  },
  {
    event: 'certification_earned',
    href: '/dashboard/certifications',
    blurb: 'Add a verified certificate from a course or program.',
  },
  {
    event: 'program_enrolled',
    href: '/dashboard/program',
    blurb: 'Enroll in a WorkforceAP training program.',
  },
  {
    event: 'assessment_completed',
    href: '/dashboard/assessment',
    blurb: 'Complete the training preassessment to tailor your plan.',
  },
  {
    event: 'interview_requested',
    href: '/dashboard/messages',
    blurb: 'Request your program interview through your counselor.',
  },
  {
    event: 'course_completed',
    href: '/dashboard',
    blurb: 'Mark a course complete in your training plan.',
  },
  {
    event: 'counselor_session',
    href: '/dashboard/ai-tools',
    blurb: 'Run an AI Counselor session for guidance.',
  },
  {
    event: 'resume_uploaded',
    href: '/dashboard/ai-tools/resume-studio?view=rewrite',
    blurb: 'Upload or build out your resume.',
  },
  {
    event: 'job_application',
    href: '/dashboard/jobs',
    blurb: 'Log a job application from the jobs board.',
  },
  {
    event: 'pathway_step_completed',
    href: '/dashboard',
    blurb: 'Finish a learning step inside your pathway.',
  },
  {
    event: 'daily_study',
    href: '/dashboard/learning',
    blurb: 'Complete any lecture or quiz activity in Coursera — counted once per day.',
  },
];

export default async function DashboardPointsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/points');

  const memberPoints = await getMemberPoints(user.id);
  const total = memberPoints.total;
  const levelMeta = getLevelForPoints(total);
  const nextLevel = getNextLevel(memberPoints.level);
  const pctToNext = nextLevel
    ? Math.min(100, Math.round(((total - levelMeta.min) / (nextLevel.min - levelMeta.min)) * 100))
    : 100;
  const icon = LEVEL_ICONS[memberPoints.level] ?? 'sprout';

  // Codex P2 catch on PR #1054: only show actions that are actually wired
  // to call `awardPoints()` in production code. POINT_VALUES has rows for
  // many events that never run in current code paths; listing them on this
  // page would promise points members can't actually earn. Keep this set in
  // sync with `awardPoints()` call sites — grep for `awardPoints(` if adding
  // new wired events:
  //   - assessment_completed   → app/api/member/assessment/submit/route.ts
  //   - program_enrolled       → app/api/member/enroll/route.ts
  //   - course_completed       → lib/member/courseCompletion.ts
  //   - counselor_session      → app/api/counselor/feedback/route.ts
  //   - placement_recorded     → app/api/admin/placements/route.ts
  //   - certification_earned   → app/api/member/certifications/route.ts
  //   - interview_requested    → app/api/member/interview-request/route.ts
  //   - resume_uploaded        → app/api/member/resume/upload/route.ts
  //   - job_application        → app/api/(portal)/dashboard/jobs/[id]/apply/route.ts
  //                              + app/api/member/job-applications/route.ts
  //                              + app/api/member/job-applications/log-external/route.ts
  //                              + app/api/member/applications/route.ts
  //   - pathway_step_completed → app/api/member/pathway-steps/[pathwayId]/[stepIndex]/complete/route.ts
  //   - daily_study            → lib/xapi/inboundStatementPipeline.ts (awarded
  //                              once per UTC calendar day per member, the
  //                              first time a resolved xAPI statement lands)
  // counselor_bonus is admin-awarded (uses customPoints), not member-earnable
  // directly, so it's intentionally excluded from EARN_ACTIONS.
  const WIRED_EVENTS = new Set<string>([
    'assessment_completed',
    'program_enrolled',
    'course_completed',
    'counselor_session',
    'placement_recorded',
    'certification_earned',
    'interview_requested',
    'resume_uploaded',
    'job_application',
    'pathway_step_completed',
    'daily_study',
  ]);
  const earnableActions = EARN_ACTIONS.filter(
    (a) => WIRED_EVENTS.has(a.event) && POINT_VALUES[a.event] > 0,
  ).sort((a, b) => POINT_VALUES[b.event] - POINT_VALUES[a.event]);

  return (
    <>
      <PageHeader
        title="Your Points"
        subtitle="Earn points as you make progress. Each milestone moves you toward the next level."
        breadcrumbs={[{ label: 'Member Portal', href: '/dashboard' }, { label: 'Your Points' }]}
      />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 1.25rem 4rem' }}>
        {/* ── Invite a friend (referral) ── */}
        <ReferralShareCard />

        {/* ── Current points summary ── */}
        <section
          className="portal-card portal-card--flat"
          style={{ padding: '1.5rem', marginBottom: '1.5rem' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '2.25rem',
                  color: levelMeta.color,
                  ['--ms-fill' as string]: 1,
                } as React.CSSProperties}
              >
                {icon}
              </span>
              <div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-on-surface-variant)',
                    margin: 0,
                  }}
                >
                  My Points
                </p>
                <p
                  style={{
                    fontSize: '2.25rem',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    margin: '0.2rem 0 0',
                    color: levelMeta.color,
                  }}
                >
                  {total.toLocaleString()}
                </p>
              </div>
            </div>
            <span
              style={{
                background: `${levelMeta.color}18`,
                color: levelMeta.color,
                border: `1px solid ${levelMeta.color}30`,
                borderRadius: 'var(--radius-full)',
                padding: '0.4rem 0.9rem',
                fontSize: '0.875rem',
                fontWeight: 700,
              }}
            >
              {levelMeta.label}
            </span>
          </div>

          {nextLevel ? (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8125rem',
                  color: 'var(--color-on-surface-variant)',
                  marginBottom: '0.4rem',
                }}
              >
                <span>
                  {pctToNext}% to {nextLevel.label}
                </span>
                <span>
                  Next: {nextLevel.label} at {nextLevel.min.toLocaleString()} pts
                </span>
              </div>
              <div
                style={{
                  height: '8px',
                  background: 'var(--surface-container-highest)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pctToNext}%`,
                    background: levelMeta.color,
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
              You&apos;ve reached the top tier. Keep going to set the bar even higher.
            </p>
          )}
        </section>

        {/* ── Tier ladder ── */}
        <section
          className="portal-card portal-card--flat"
          style={{ padding: '1.5rem', marginBottom: '1.5rem' }}
        >
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--color-on-surface-variant)',
              margin: '0 0 1rem',
            }}
          >
            Levels
          </h2>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {LEVELS.map((l) => {
              const reached = total >= l.min;
              const current = l.name === memberPoints.level;
              const range =
                l.max === Infinity ? `${l.min.toLocaleString()}+ pts` : `${l.min.toLocaleString()}–${l.max.toLocaleString()} pts`;
              return (
                <div
                  key={l.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    padding: '0.75rem 1rem',
                    border: `1px solid ${current ? l.color + '60' : 'var(--outline-variant)'}`,
                    borderRadius: 'var(--radius-md, 0.625rem)',
                    background: current ? `${l.color}14` : 'transparent',
                    opacity: reached ? 1 : 0.7,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '1.5rem',
                      color: l.color,
                      ['--ms-fill' as string]: reached ? 1 : 0,
                    } as React.CSSProperties}
                  >
                    {LEVEL_ICONS[l.name] ?? 'sprout'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        color: 'var(--color-on-surface)',
                      }}
                    >
                      {l.label}
                      {current && (
                        <span
                          style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: l.color,
                          }}
                        >
                          You are here
                        </span>
                      )}
                    </p>
                    <p
                      style={{
                        margin: '0.15rem 0 0',
                        fontSize: '0.8125rem',
                        color: 'var(--color-on-surface-variant)',
                      }}
                    >
                      {range}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── How to earn points ── */}
        <section
          className="portal-card portal-card--flat"
          style={{ padding: '1.5rem' }}
        >
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--color-on-surface-variant)',
              margin: '0 0 0.75rem',
            }}
          >
            How to earn points
          </h2>
          <p
            style={{
              margin: '0 0 1.25rem',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              color: 'var(--color-on-surface-variant)',
            }}
          >
            Points are awarded automatically when you hit a milestone. Most actions are
            counted once — finishing the same course or uploading the same resume twice
            won&apos;t double-count. Daily study points are the exception: they&apos;re
            earned again each new day you&apos;re active.
          </p>

          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: '0.5rem',
            }}
          >
            {earnableActions.map((action) => {
              const points = POINT_VALUES[action.event];
              const label = EVENT_LABELS[action.event] ?? action.event;
              const content = (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        color: 'var(--color-on-surface)',
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        margin: '0.2rem 0 0',
                        fontSize: '0.8125rem',
                        color: 'var(--color-on-surface-variant)',
                        lineHeight: 1.5,
                      }}
                    >
                      {action.blurb}
                    </p>
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: '0.875rem',
                      fontWeight: 800,
                      color: 'var(--color-green, #16a34a)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    +{points} pts
                  </span>
                </>
              );

              const itemStyle: React.CSSProperties = {
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.875rem 1rem',
                border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-md, 0.625rem)',
                background: 'var(--surface-container-lowest, transparent)',
                textDecoration: 'none',
                color: 'inherit',
              };

              return (
                <li key={action.event}>
                  {action.href ? (
                    <Link href={action.href} style={itemStyle}>
                      {content}
                    </Link>
                  ) : (
                    <div style={itemStyle}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>

          <div style={{ marginTop: '1.25rem' }}>
            <Link
              href="/dashboard"
              className="btn btn-muted"
              style={{ fontSize: '0.875rem' }}
            >
              Back to dashboard
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
