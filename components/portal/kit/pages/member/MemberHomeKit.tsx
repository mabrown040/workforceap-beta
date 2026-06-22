import {
  Play,
  Wand2,
  Medal,
  GraduationCap,
  ArrowRight,
  Home,
} from 'lucide-react';
import {
  DataTable,
  DesignSurface,
  KpiStrip,
  ProgressRing,
  StatusTag,
  type Column,
} from '@/components/portal/kit';

/**
 * Member Portal — HOME view.
 * Faithful port of the `data-view-panel="home"` section of
 * docs/mockups/workforceap-member-suite.html (Gold × Stat-Dense suite).
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
      render: (row) => <span style={{ color: '#525252' }}>{row.company}</span>,
    },
    {
      key: 'stage',
      header: 'Stage',
      align: 'right',
      render: (row) => <StatusTag tone={row.tone}>{row.stage}</StatusTag>,
    },
  ];

  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        {/* Greeting */}
        <div>
          <div
            className="wa-flex wa-items-center wa-gap-2 wa-text-xs wa-font-bold wa-uppercase"
            style={{ letterSpacing: '0.12em', color: 'var(--wa-accent)' }}
          >
            <Home size={13} />
            <span>{greeting}</span>
          </div>
          <h2 className="h-font" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 4 }}>
            Keep climbing, {firstName}.
          </h2>
        </div>

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
            className="wa-kit-card"
            style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 24 }}
          >
            <ProgressRing pct={pct} size={112} color="accent" />
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
                  background: 'var(--wa-accent)',
                  color: '#fff',
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

          {/* Career Toolkit gradient tile */}
          <a
            href={toolkitHref}
            className="wa-kit-card wa-kit-card--gradient-crimson wa-kit-card--hover wa-kit-focus"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 180,
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--wa-radius-sm)' }}>
                <Wand2 size={20} />
              </div>
              <span
                style={{ padding: '2px 9px', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', background: 'rgba(255,255,255,0.2)', borderRadius: 999 }}
              >
                AI
              </span>
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>Career Toolkit</h3>
              <p style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Resume audit + cover letters.</p>
            </div>
          </a>

          {/* Next Badge */}
          <div
            className="wa-kit-card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180, borderColor: '#ece2c8' }}
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

          {/* Active Job Pipeline (2-wide) */}
          <div className="wa-kit-card" style={{ gridColumn: 'span 2' }}>
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
              mobile="scroll"
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
