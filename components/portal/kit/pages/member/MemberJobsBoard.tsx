import { Briefcase } from 'lucide-react';
import NextLink from 'next/link';
import type { ReactNode } from 'react';
import { DesignSurface, JobListingRow, KitEmptyState, PageOpener } from '@/components/portal/kit';
import LogExternalApplicationButton from '@/components/portal/jobs/LogExternalApplicationButton';

/**
 * Member Portal — JOB BOARD listing (open roles, not the tracked pipeline).
 * Same PageOpener chrome as the live anonymous / `?ui=legacy` jobs listing
 * so /dev/member/jobs?state=board and /dashboard/jobs share JobListingRow.
 *
 * Defaults are empty. Proofs pass sample rows; live listing uses JobsListingClient.
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

function BoardCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <NextLink
      href={href}
      className="wa-page-action wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
    >
      {children}
    </NextLink>
  );
}

export function MemberJobsBoard({
  title = 'Open roles',
  lede = 'Hiring-partner openings. Track applications from the pipeline.',
  pipelineHref = '/dev/member/jobs',
  jobs = [],
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
        <div className="wa-kit-card" style={{ padding: jobs.length === 0 ? undefined : 0, overflow: 'hidden' }}>
          {jobs.length === 0 ? (
            <KitEmptyState
              title="No open roles right now"
              description="Check the pipeline for jobs you already applied to, or add one from another site."
              action={<BoardCta href={pipelineHref}>View pipeline</BoardCta>}
            />
          ) : (
            jobs.map((job, i) => (
              <JobListingRow
                key={job.id}
                href={job.href ?? '#'}
                title={job.title}
                meta={`${job.company} · ${job.location} · ${job.meta}`}
                match={job.match}
                applied={job.applied}
                first={i === 0}
              />
            ))
          )}
        </div>
        <div
          className="wa-kit-card wa-flex wa-flex-col sm:wa-flex-row sm:wa-items-center"
          style={{ gap: 16 }}
        >
          <div style={{ flex: 1, minWidth: '14rem' }}>
            <p style={{ fontSize: 'var(--wa-type-body)', fontWeight: 800, color: 'var(--wa-text)', margin: '0 0 4px' }}>
              Applied somewhere else?
            </p>
            <p className="wa-kit-lede" style={{ margin: 0 }}>
              Add it to your tracker so your counselor can follow up.
            </p>
          </div>
          <LogExternalApplicationButton preview variant="primary" />
        </div>
        <div className="wa-kit-card">
          <p style={{ fontSize: 'var(--wa-type-body)', fontWeight: 700, color: 'var(--wa-text)', margin: '0 0 4px' }}>
            Search beyond this board
          </p>
          <p className="wa-kit-lede" style={{ margin: 0 }}>
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
                <p style={{ fontSize: 'var(--wa-type-body)', fontWeight: 700, color: 'var(--wa-text)', margin: '0 0 4px' }}>
                  {engine.label}
                </p>
                <p className="wa-kit-meta" style={{ fontWeight: 700, color: 'var(--wa-accent)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Best for: {engine.bestFor}
                </p>
                <p className="wa-kit-lede" style={{ margin: 0 }}>
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
