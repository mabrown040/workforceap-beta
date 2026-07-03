import {
  Play,
  Wand2,
  Medal,
  GraduationCap,
  ArrowRight,
  Home,
  Flame,
  Target,
} from 'lucide-react';
import {
  DataTable,
  DesignSurface,
  KpiStrip,
  ProgressRing,
  StatusTag,
  type Column,
} from '@/components/portal/kit';
import MemberDoThisNextCard from '@/components/portal/MemberDoThisNextCard';
import type { NextBestAction } from '@/lib/member/nextBestActions';

/**
 * Member Portal — HOME view.
 * Faithful port of the `data-view-panel="home"` section of
 * docs/mockups/workforceap-member-suite.html (Gold × Stat-Dense suite),
 * plus a dominant next-best-action banner above the bento grid (design
 * review: six equal tiles didn't answer "what should I do next?"). The
 * Career Toolkit + Next Badge tiles below were quieted to keep a single
 * hierarchy: next action → progress → everything else.
 *
 * Target route: app/(portal)/dashboard
 * Surface: warm (member-facing).
 */

type JobStageTone = 'warn' | 'muted' | 'info';

interface PipelineRow {
  role: string;
  company: string;
  stage: string;
  tone: JobStageTone;
}

interface GoalSummary {
  title: string;
  /** 0–100 completion. */
  percent: number;
}

export interface MemberHomeKitProps {
  firstName?: string;
  greeting?: string;
  /** 0–100 course completion. */
  coursePercent?: number;
  activeJobs?: number;
  certs?: number;
  points?: number;
  programTitle?: string;
  programStatus?: string;
  nextLesson?: string;
  nextLessonDue?: string;
  /** Next badge progress (0–100). */
  nextBadgePercent?: number;
  nextBadgeName?: string;
  nextBadgeRemaining?: string;
  /** Short list shown in the home "Active Job Pipeline" card. */
  pipeline?: PipelineRow[];
  resumeHref?: string;
  toolkitHref?: string;
  jobsHref?: string;
  coursesHref?: string;
  /** Daily-habit streak (see lib/member/streaks.ts). 0 renders nothing. */
  currentStreak?: number;
  longestStreak?: number;
  /** Up to a few active goals for the compact goals summary tile. */
  goals?: GoalSummary[];
  goalsHref?: string;
  /** Dominant next-best-action banner rendered above the bento grid. `null`/omitted renders nothing (no empty shell). */
  doThisNext?: NextBestAction | null;
}

const DEFAULT_PIPELINE: PipelineRow[] = [
  { role: 'Salesforce Administrator', company: 'Deloitte', stage: 'Interviewing', tone: 'warn' },
  { role: 'Agentforce SE', company: 'Accenture', stage: 'Applied', tone: 'muted' },
  { role: 'Cloud Support Associate', company: 'Indeed', stage: 'Screening', tone: 'info' },
];

export function MemberHomeKit({
  firstName = 'Mike',
  greeting = 'Good morning',
  coursePercent = 78,
  activeJobs = 4,
  certs = 2,
  points = 1240,
  programTitle = 'AWS Cloud Practitioner',
  programStatus = 'In Progress',
  nextLesson = 'Shared Responsibility Model',
  nextLessonDue = 'Due Thursday',
  nextBadgePercent = 60,
  nextBadgeName = 'Cloud Foundations',
  nextBadgeRemaining = '2 modules',
  pipeline = DEFAULT_PIPELINE,
  resumeHref = '/dashboard/program',
  toolkitHref = '/dashboard/toolkit',
  jobsHref = '/dashboard/jobs',
  coursesHref = '#',
  currentStreak = 0,
  longestStreak = 0,
  goals = [],
  goalsHref = '/dashboard?ui=legacy&tab=learning#goals',
  doThisNext = null,
}: MemberHomeKitProps) {
  const pct = Math.max(0, Math.min(100, Math.round(coursePercent)));
  const pipelineColumns: Column<PipelineRow>[] = [
    {
      key: 'role',
      header: 'Role',
      render: (row) => <span style={{ fontWeight: 700 }}>{row.role}</span>,
    },
    {
      key: 'company',
      header: 'Company',
      render: (row) => <span style={{ color: 'var(--wa-muted)' }}>{row.company}</span>,
    },
    {
      key: 'stage',
      header: 'Stage',
      align: 'right',
      render: (row) => <StatusTag tone={row.tone}>{row.stage}</StatusTag>,
    },
  ];
  const pipelineCard = (row: PipelineRow) => (
    <div className="wa-kit-card wa-kit-card--sm">
      <div className="wa-flex wa-items-start wa-justify-between wa-gap-3">
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--wa-text)' }}>{row.role}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: 'var(--wa-muted)' }}>{row.company}</div>
        </div>
        <StatusTag tone={row.tone}>{row.stage}</StatusTag>
      </div>
    </div>
  );

  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        <h1 className="sr-only">Member dashboard</h1>
        {/* Greeting */}
        <div>
          <div
            className="wa-flex wa-items-center wa-gap-2 wa-text-xs wa-font-bold wa-uppercase"
            style={{ letterSpacing: '0.12em', color: 'var(--wa-accent)' }}
          >
            <Home size={13} />
            <span>{greeting}</span>
          </div>
          <h2 className="h-font" style={{ fontSize: 'clamp(22px, 6vw, 30px)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: 4 }}>
            Keep climbing, {firstName}.
          </h2>
        </div>

        {/* Dominant next-best-action — answers "what should I do next?"
            before anything else on the page. Renders nothing when there's
            no pending action (see MemberDoThisNextCard). */}
        <MemberDoThisNextCard action={doThisNext} variant="kit" paddingX="0" />

        {/* Compact streak/points banner — restores the motivation stack on
            the lean home kit. Renders nothing when there's no streak yet. */}
        {currentStreak > 0 && (
          <div
            className="wa-kit-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'color-mix(in srgb, var(--wa-gold, #f97316) 8%, var(--wa-surface, transparent))',
              borderColor: 'color-mix(in srgb, var(--wa-gold, #f97316) 30%, transparent)',
            }}
          >
            <Flame size={18} color="var(--wa-gold, #f97316)" aria-hidden />
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--wa-text)' }}>
              {currentStreak}-day streak
            </span>
            <span style={{ fontSize: 12, color: 'var(--wa-muted)' }}>
              {longestStreak > currentStreak ? `· Best: ${longestStreak} days` : '· Your best yet — keep it going!'}
            </span>
          </div>
        )}

        {/* KPI strip */}
        <KpiStrip
          items={[
            { label: 'Course', value: `${pct}%`, color: 'accent' },
            { label: 'Active Jobs', value: activeJobs, color: 'text' },
            { label: 'Certs', value: certs, color: 'gold' },
            { label: 'Points', value: points.toLocaleString(), color: 'info' },
          ]}
        />

        {/* Bento grid */}
        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 lg:wa-grid-cols-4 wa-gap-5">
          {/* Program progress ring (2-wide) */}
          <div
            className="wa-kit-card md:wa-col-span-2"
            style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}
          >
            <ProgressRing pct={pct} size={112} color="accent" label="Course completion" />
            <div>
              <StatusTag tone="ok">{programStatus}</StatusTag>
              <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 8 }}>{programTitle}</h3>
              <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 4 }}>
                Next: {nextLesson} ·{' '}
                <span style={{ color: 'var(--wa-accent)', fontWeight: 700 }}>{nextLessonDue}</span>
              </p>
              <a
                href={resumeHref}
                className="wa-kit-focus"
                style={{
                  marginTop: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  minHeight: 44,
                  background: 'var(--wa-accent)',
                  color: 'var(--wa-on-accent)',
                  fontWeight: 600,
                  fontSize: 12,
                  borderRadius: 999,
                  textDecoration: 'none',
                }}
              >
                Resume <Play size={11} />
              </a>
            </div>
          </div>

          {/* Career Toolkit — a static shortcut, not a personalized action;
              quieted (plain card, no gradient) so it doesn't compete with
              the dominant next-best-action banner above. */}
          <a
            href={toolkitHref}
            className="wa-kit-card wa-kit-card--hover wa-kit-focus"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 180,
              textDecoration: 'none',
            }}
          >
            <div className="wa-flex wa-items-start wa-justify-between">
              <div
                style={{ padding: 12, width: 'fit-content', background: 'var(--wa-bg)', color: 'var(--wa-accent)', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--wa-border)' }}
              >
                <Wand2 size={20} />
              </div>
              <span className="wa-kit-tag wa-kit-tag--alert">AI</span>
            </div>
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--wa-text)' }}>Career Toolkit</h3>
              <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 4 }}>Resume audit + cover letters.</p>
            </div>
          </a>

          {/* Next Badge — informational (gamification), quieted to a plain
              card border so it reads as "everything else", not a second
              actionable tile. */}
          <div
            className="wa-kit-card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180 }}
          >
            <div>
              <div
                style={{ padding: 12, width: 'fit-content', background: 'var(--wa-gold-soft, #FEF3C7)', color: 'var(--wa-gold)', borderRadius: 'var(--wa-radius-sm)' }}
              >
                <Medal size={20} />
              </div>
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>Next Badge</h3>
                <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 4 }}>
                  {nextBadgeRemaining} to &ldquo;{nextBadgeName}&rdquo;.
                </p>
              </div>
            </div>
            <div
              className="wa-kit-bar-track"
              role="progressbar"
              aria-valuenow={nextBadgePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${nextBadgeName} badge progress`}
            >
              <div className="wa-kit-bar-fill" style={{ width: `${nextBadgePercent}%`, background: 'var(--wa-gold)' }} />
            </div>
          </div>

          {/* Goals summary */}
          <a
            href={goalsHref}
            className="wa-kit-card wa-kit-card--hover wa-kit-focus"
            style={{ display: 'flex', flexDirection: 'column', minHeight: 180, textDecoration: 'none', gap: 10 }}
          >
            <div className="wa-flex wa-items-center wa-justify-between">
              <div
                style={{ padding: 12, width: 'fit-content', background: 'var(--wa-bg)', color: 'var(--wa-accent)', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--wa-border)' }}
              >
                <Target size={20} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--wa-accent)' }}>
                {goals.length} active
              </span>
            </div>
            {goals.length === 0 ? (
              <div>
                <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--wa-text)' }}>Goals</h3>
                <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 4 }}>
                  Set a goal to track your momentum.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {goals.slice(0, 3).map((g) => (
                  <div key={g.title}>
                    <div className="wa-flex wa-items-center wa-justify-between" style={{ marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wa-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.title}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--wa-muted)', flexShrink: 0, marginLeft: 6 }}>
                        {g.percent}%
                      </span>
                    </div>
                    <div className="wa-kit-bar-track" role="progressbar" aria-valuenow={g.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.title} progress`}>
                      <div className="wa-kit-bar-fill" style={{ width: `${g.percent}%`, background: 'var(--wa-accent)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </a>

          {/* Active Job Pipeline (2-wide) */}
          <div className="wa-kit-card md:wa-col-span-2">
            <div className="wa-flex wa-items-center wa-justify-between" style={{ marginBottom: 12 }}>
              <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>Active Job Pipeline</h3>
              <a
                href={jobsHref}
                className="wa-kit-focus"
                style={{ fontSize: 11, fontWeight: 700, color: 'var(--wa-accent)', textDecoration: 'none' }}
              >
                View all &rarr;
              </a>
            </div>
            <DataTable<PipelineRow>
              columns={pipelineColumns}
              rows={pipeline}
              rowKey={(row) => `${row.role}-${row.company}`}
              mobile="cards"
              cardRender={pipelineCard}
              minWidth={520}
              emptyTitle="No active applications"
              emptyDescription="Saved and submitted jobs will appear here."
            />
          </div>

          {/* Learning Hub */}
          <div className="wa-kit-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180 }}>
            <div>
              <div
                style={{ padding: 12, width: 'fit-content', background: 'var(--wa-bg)', color: 'var(--wa-info)', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--wa-border)' }}
              >
                <GraduationCap size={20} />
              </div>
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>Learning Hub</h3>
                <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 4 }}>Coursera B2B courses.</p>
              </div>
            </div>
            <a
              href={coursesHref}
              className="wa-kit-focus"
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--wa-accent)', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              Go to courses <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </div>
    </DesignSurface>
  );
}
