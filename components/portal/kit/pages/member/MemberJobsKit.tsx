import { Briefcase, Compass, Sparkles } from 'lucide-react';
import NextLink from 'next/link';
import type { ReactNode } from 'react';
import { DesignSurface, KpiStrip, DataTable, StatusTag, PageOpener, JobListingRow, type Column, type KitTone } from '@/components/portal/kit';
import { JOBS_EMPTY_RECOMMENDATIONS } from '@/lib/member/jobPipelineDisplay';

/**
 * Member Portal — JOB PIPELINE view.
 * Faithful port of `data-view-panel="jobs"` in
 * docs/mockups/workforceap-member-suite.html.
 * Recommended matches use JobListingRow so pipeline, board, and listing share one row.
 *
 * Target route: app/(portal)/dashboard/jobs
 * Surface: warm (member-facing).
 */

interface ApplicationRow {
  id: string;
  role: string;
  company: string;
  location: string;
  applied: string;
  stage: string;
  tone: KitTone;
}

interface RecommendedJob {
  id: string;
  logo: string;
  match: string;
  title: string;
  meta: string;
}

export interface MemberJobsKitProps {
  saved?: number;
  applied?: number;
  interviewing?: number;
  offers?: number;
  syncedLabel?: string;
  browseHref?: string;
  profileHref?: string;
  /** Match-row destination. Proofs pass a hash so they stay on /dev/member. */
  jobHref?: (jobId: string) => string;
  applications?: ApplicationRow[];
  recommended?: RecommendedJob[];
}

const DEFAULT_APPLICATIONS: ApplicationRow[] = [
  { id: 'a1', role: 'Salesforce Administrator', company: 'Deloitte', location: 'Austin, TX', applied: 'Jun 12', stage: 'Interviewing', tone: 'warn' },
  { id: 'a2', role: 'Agentforce Solutions Engineer', company: 'Accenture', location: 'Remote', applied: 'Jun 14', stage: 'Applied', tone: 'muted' },
  { id: 'a3', role: 'Cloud Support Associate', company: 'Indeed', location: 'Austin, TX', applied: 'Jun 16', stage: 'Screening', tone: 'info' },
  { id: 'a4', role: 'Junior Cloud Engineer', company: 'Oracle', location: 'Austin, TX', applied: 'Jun 18', stage: 'Applied', tone: 'muted' },
];

function JobsCta({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  const primary = variant === 'primary';
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
        background: primary ? 'var(--wa-accent)' : 'transparent',
        color: primary ? 'var(--wa-on-accent)' : 'var(--wa-accent)',
        border: primary ? 'none' : '1px solid var(--wa-border)',
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

export function MemberJobsKit({
  saved = 9,
  applied = 4,
  interviewing = 1,
  offers = 0,
  syncedLabel = 'Synced 3m ago',
  browseHref = '#',
  profileHref = '/dashboard/profile',
  jobHref = (id: string) => `/dashboard/jobs/${id}`,
  applications = DEFAULT_APPLICATIONS,
  recommended = [],
}: MemberJobsKitProps) {
  const columns: Column<ApplicationRow>[] = [
    { key: 'role', header: 'Role', render: (r) => <span style={{ fontWeight: 700 }}>{r.role}</span> },
    { key: 'company', header: 'Company', render: (r) => <span style={{ color: 'var(--wa-muted)' }}>{r.company}</span> },
    { key: 'location', header: 'Location', render: (r) => <span style={{ color: 'var(--wa-muted)' }}>{r.location}</span> },
    { key: 'applied', header: 'Applied', render: (r) => <span style={{ color: 'var(--wa-muted)', fontVariantNumeric: 'tabular-nums' }}>{r.applied}</span> },
    { key: 'stage', header: 'Stage', align: 'right', render: (r) => <StatusTag tone={r.tone}>{r.stage}</StatusTag> },
  ];
  const applicationCard = (row: ApplicationRow) => (
    <div className="wa-kit-card wa-kit-card--sm">
      <div className="wa-flex wa-items-start wa-justify-between wa-gap-3">
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--wa-text)' }}>{row.role}</div>
          <div style={{ marginTop: 2, fontSize: 13, color: 'var(--wa-muted)' }}>{row.company}</div>
          <div style={{ marginTop: 2, fontSize: 13, color: 'var(--wa-muted)' }}>
            {row.location} · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.applied}</span>
          </div>
        </div>
        <StatusTag tone={row.tone}>{row.stage}</StatusTag>
      </div>
    </div>
  );

  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--wa-pad-sm)' }} className="wa-space-y-6">
        <PageOpener
          kicker="Job search"
          title="Pipeline"
          lede="Applications, matches, next interviews."
          icon={<Compass size={13} aria-hidden="true" />}
        />
        <KpiStrip
          items={[
            { label: 'Saved', value: saved, color: 'text' },
            { label: 'Applied', value: applied, color: 'info' },
            { label: 'Interviewing', value: interviewing, color: 'gold' },
            { label: 'Offers', value: offers, color: 'success' },
          ]}
        />

        <div className="wa-kit-card">
          <div className="wa-flex wa-flex-col md:wa-flex-row md:wa-items-center wa-justify-between wa-gap-3" style={{ marginBottom: 16 }}>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>Applications</h2>
              <p style={{ fontSize: 13, color: 'var(--wa-muted)' }}>{syncedLabel}</p>
            </div>
            {applications.length > 0 ? <JobsCta href={browseHref}>Open board</JobsCta> : null}
          </div>
          {applications.length === 0 ? (
            <div>
              <Briefcase size={22} aria-hidden="true" style={{ color: 'var(--wa-accent)' }} />
              <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', margin: '10px 0 0' }}>No applications yet</h3>
              <p style={{ fontSize: 14, color: 'var(--wa-muted)', marginTop: 6, lineHeight: 1.5 }}>
                Track jobs you apply to. They appear here.
              </p>
              <div style={{ marginTop: 16 }}>
                <JobsCta href={browseHref}>Open board</JobsCta>
              </div>
            </div>
          ) : (
            <DataTable<ApplicationRow>
              columns={columns}
              rows={applications}
              rowKey={(r) => r.id}
              mobile="cards"
              cardRender={applicationCard}
              minWidth={560}
              emptyTitle="No applications yet"
              emptyDescription="Track jobs you apply to. They appear here."
            />
          )}
        </div>

        <div>
          <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', marginBottom: 16 }}>Recommended</h2>
          {recommended.length === 0 ? (
            <div className="wa-kit-card">
              <Sparkles size={22} aria-hidden="true" style={{ color: 'var(--wa-accent)' }} />
              <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', margin: '10px 0 0' }}>
                {JOBS_EMPTY_RECOMMENDATIONS.title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--wa-muted)', marginTop: 6, lineHeight: 1.5 }}>
                {JOBS_EMPTY_RECOMMENDATIONS.description}
              </p>
              <div className="wa-flex wa-flex-wrap wa-gap-2" style={{ marginTop: 16 }}>
                <JobsCta href={profileHref}>{JOBS_EMPTY_RECOMMENDATIONS.primaryCta}</JobsCta>
                {applications.length === 0 ? (
                  <JobsCta href={browseHref} variant="secondary">
                    {JOBS_EMPTY_RECOMMENDATIONS.secondaryCta}
                  </JobsCta>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="wa-kit-card" style={{ padding: 0, overflow: 'hidden' }}>
              {recommended.map((job, i) => (
                <JobListingRow
                  key={job.id}
                  href={jobHref(job.id)}
                  title={job.title}
                  meta={job.meta}
                  match={job.match}
                  first={i === 0}
                  icon={
                    job.logo ? (
                      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.04em' }}>{job.logo}</span>
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DesignSurface>
  );
}
