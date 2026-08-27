import { Briefcase } from 'lucide-react';
import NextLink from 'next/link';
import type { ReactNode } from 'react';
import { DesignSurface, JobListingRow, PageOpener } from '@/components/portal/kit';
import LogExternalApplicationButton from '@/components/portal/jobs/LogExternalApplicationButton';

/**
 * Member Portal — JOB BOARD listing (open roles, not the tracked pipeline).
 * Same PageOpener chrome as the live anonymous / `?ui=legacy` jobs listing
 * so /dev/member/jobs?state=board and /dashboard/jobs share JobListingRow.
 *
 * Target route: app/(portal)/dashboard/jobs (listing branch)
 * Surface: warm (member-facing).
 */

export interface BoardJob {
  id: string;
  title: string;
  company: string;
  location: string;
  meta: string;
  match?: string;
  applied?: boolean;
  href?: string;
}

export interface MemberJobsBoardProps {
  title?: string;
  lede?: string;
  pipelineHref?: string;
  jobs?: BoardJob[];
}

const DEFAULT_JOBS: BoardJob[] = [
  {
    id: 'j1',
    title: 'Cloud Support Engineer',
    company: 'Deloitte',
    location: 'Austin, TX',
    meta: 'Full-time · $58k–72k',
    match: '92% match',
    applied: true,
  },
  {
    id: 'j2',
    title: 'Junior Salesforce Consultant',
    company: 'Accenture',
    location: 'Remote',
    meta: 'Full-time · $54k–66k',
    match: '87% match',
  },
  {
    id: 'j3',
    title: 'Technical Support Associate',
    company: 'Tesla',
    location: 'Austin, TX',
    meta: 'Full-time · $46k–52k',
    match: '74% match',
  },
  {
    id: 'j4',
    title: 'IT Support Specialist',
    company: 'HEB',
    location: 'Austin, TX',
    meta: 'Full-time · $48k–55k',
  },
];

function BoardCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <NextLink
      href={href}
      className="wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        padding: '10px 16px',
        background: 'transparent',
        color: 'var(--wa-accent)',
        border: '1px solid var(--wa-border)',
        fontWeight: 600,
        fontSize: 14,
        borderRadius: 999,
        textDecoration: 'none',
      }}
    >
      {children}
    </NextLink>
  );
}

export function MemberJobsBoard({
  title = 'Open roles',
  lede = 'Hiring-partner openings. Track applications from the pipeline.',
  pipelineHref = '/dev/member/jobs',
  jobs = DEFAULT_JOBS,
}: MemberJobsBoardProps) {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--wa-pad-sm)' }} className="wa-space-y-6">
        <PageOpener
          kicker="Job search"
          title={title}
          lede={lede}
          icon={<Briefcase size={13} aria-hidden="true" />}
          action={<BoardCta href={pipelineHref}>View pipeline</BoardCta>}
        />
        <div className="wa-kit-card" style={{ padding: 0, overflow: 'hidden' }}>
          {jobs.map((job, i) => (
            <JobListingRow
              key={job.id}
              href={job.href ?? '#'}
              title={job.title}
              meta={`${job.company} · ${job.location} · ${job.meta}`}
              match={job.match}
              applied={job.applied}
              first={i === 0}
            />
          ))}
        </div>
        <div
          className="wa-kit-card wa-flex wa-flex-col sm:wa-flex-row sm:wa-items-center"
          style={{ gap: 16 }}
        >
          <div style={{ flex: 1, minWidth: '14rem' }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--wa-text)', margin: '0 0 4px' }}>
              Applied somewhere else?
            </p>
            <p style={{ fontSize: 13, color: 'var(--wa-muted)', margin: 0, lineHeight: 1.45 }}>
              Add it to your tracker so your counselor can follow up.
            </p>
          </div>
          <LogExternalApplicationButton preview variant="primary" />
        </div>
        <div className="wa-kit-card">
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wa-text)', margin: '0 0 4px' }}>
            Search beyond this board
          </p>
          <p style={{ fontSize: 13, color: 'var(--wa-muted)', margin: 0, lineHeight: 1.45 }}>
            If no city is saved yet, start with Austin metro.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 12,
              marginTop: 16,
            }}
          >
            {[
              { label: 'Indeed', bestFor: 'volume', note: 'Largest feed for Austin metro roles.' },
              { label: 'LinkedIn', bestFor: 'network', note: 'Warm intros and recruiter traffic.' },
              { label: 'WorkInTexas', bestFor: 'local', note: 'Texas workforce listings and WIOA-adjacent roles.' },
            ].map((engine) => (
              <div key={engine.label} className="wa-kit-card wa-kit-card--sm">
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wa-text)', margin: '0 0 4px' }}>
                  {engine.label}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--wa-accent)',
                    margin: '0 0 4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Best for: {engine.bestFor}
                </p>
                <p style={{ fontSize: 13, color: 'var(--wa-muted)', margin: 0, lineHeight: 1.45 }}>
                  {engine.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DesignSurface>
  );
}
