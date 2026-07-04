import { Briefcase, Sparkles } from 'lucide-react';
import { DesignSurface, KpiStrip, DataTable, StatusTag, type Column, type KitTone } from '@/components/portal/kit';

/**
 * Member Portal — JOB PIPELINE view.
 * Faithful port of `data-view-panel="jobs"` in
 * docs/mockups/workforceap-member-suite.html.
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
  applications?: ApplicationRow[];
  recommended?: RecommendedJob[];
}

const DEFAULT_APPLICATIONS: ApplicationRow[] = [
  { id: 'a1', role: 'Salesforce Administrator', company: 'Deloitte', location: 'Austin, TX', applied: 'Jun 12', stage: 'Interviewing', tone: 'warn' },
  { id: 'a2', role: 'Agentforce Solutions Engineer', company: 'Accenture', location: 'Remote', applied: 'Jun 14', stage: 'Applied', tone: 'muted' },
  { id: 'a3', role: 'Cloud Support Associate', company: 'Indeed', location: 'Austin, TX', applied: 'Jun 16', stage: 'Screening', tone: 'info' },
  { id: 'a4', role: 'Junior Cloud Engineer', company: 'Oracle', location: 'Austin, TX', applied: 'Jun 18', stage: 'Applied', tone: 'muted' },
];

export function MemberJobsKit({
  saved = 9,
  applied = 4,
  interviewing = 1,
  offers = 0,
  syncedLabel = 'Synced 3m ago',
  browseHref = '#',
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
          <div style={{ marginTop: 2, fontSize: 12, color: 'var(--wa-muted)' }}>{row.company}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: 'var(--wa-muted)' }}>
            {row.location} · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.applied}</span>
          </div>
        </div>
        <StatusTag tone={row.tone}>{row.stage}</StatusTag>
      </div>
    </div>
  );

  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        <h1 className="sr-only">Job pipeline</h1>
        {/* KPI strip */}
        <KpiStrip
          items={[
            { label: 'Saved', value: saved, color: 'text' },
            { label: 'Applied', value: applied, color: 'info' },
            { label: 'Interviewing', value: interviewing, color: 'gold' },
            { label: 'Offers', value: offers, color: 'success' },
          ]}
        />

        {/* Application pipeline */}
        <div className="wa-kit-card">
          <div className="wa-flex wa-flex-col md:wa-flex-row md:wa-items-center wa-justify-between wa-gap-3" style={{ marginBottom: 16 }}>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>Application Pipeline</h2>
              <p style={{ fontSize: 12, color: 'var(--wa-muted)' }}>{syncedLabel}</p>
            </div>
            <a
              href={browseHref}
              className="wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
              style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '8px 16px', background: 'var(--wa-accent)', color: 'var(--wa-on-accent)', fontWeight: 600, fontSize: 12, borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              Browse Job Board
            </a>
          </div>
          {applications.length === 0 ? (
            <div className="wa-kit-card wa-kit-card--sm wa-flex wa-items-start wa-gap-3">
              <div
                aria-hidden="true"
                style={{ width: 40, height: 40, borderRadius: 'var(--wa-radius-sm)', background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <Briefcase size={18} aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wa-text)' }}>No applications yet</p>
                <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 2 }}>
                  Track jobs you apply to and they&rsquo;ll show up here.
                </p>
                <a
                  href={browseHref}
                  className="wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
                  style={{ display: 'inline-flex', alignItems: 'center', minHeight: 36, marginTop: 12, padding: '8px 14px', background: 'var(--wa-accent)', color: 'var(--wa-on-accent)', fontWeight: 600, fontSize: 12, borderRadius: 999, textDecoration: 'none' }}
                >
                  Browse Job Board
                </a>
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
              emptyDescription="Track jobs you apply to and they'll show up here."
            />
          )}
        </div>

        {/* Recommended for you */}
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', marginBottom: 12 }}>Recommended for you</h2>
          {recommended.length === 0 ? (
            <div className="wa-kit-card wa-kit-card--sm wa-flex wa-items-start wa-gap-3">
              <div
                aria-hidden="true"
                style={{ width: 40, height: 40, borderRadius: 'var(--wa-radius-sm)', background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <Sparkles size={18} aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wa-text)' }}>No recommendations yet</p>
                <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 2 }}>
                  Keep your profile and certifications up to date and we&rsquo;ll surface matching roles here.
                </p>
                <a
                  href={browseHref}
                  className="wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
                  style={{ display: 'inline-flex', alignItems: 'center', minHeight: 36, marginTop: 12, padding: '8px 14px', background: 'var(--wa-accent)', color: 'var(--wa-on-accent)', fontWeight: 600, fontSize: 12, borderRadius: 999, textDecoration: 'none' }}
                >
                  Browse Job Board
                </a>
              </div>
            </div>
          ) : (
          <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-4">
            {recommended.map((job) => (
              <div key={job.id} className="wa-kit-card wa-kit-card--sm wa-kit-card--hover">
                <div className="wa-flex wa-items-start wa-justify-between">
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--wa-radius-sm)',
                      background: 'var(--wa-accent-soft)',
                      color: 'var(--wa-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {job.logo}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--wa-success)' }}>{job.match}</span>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 14, marginTop: 12 }}>{job.title}</h3>
                <p style={{ fontSize: 11, color: 'var(--wa-muted)', marginTop: 2 }}>{job.meta}</p>
                <a
                  href={`/dashboard/jobs/${job.id}`}
                  className="wa-kit-focus hover:wa-bg-[var(--wa-accent-soft)] active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[background-color,transform] wa-duration-150 motion-reduce:wa-transition-none"
                  style={{
                    marginTop: 12,
                    display: 'block',
                    width: '100%',
                    minHeight: 44,
                    padding: '10px 0',
                    border: '1px solid var(--wa-accent)',
                    color: 'var(--wa-accent)',
                    background: 'transparent',
                    fontWeight: 600,
                    fontSize: 12,
                    borderRadius: 999,
                    textAlign: 'center',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Quick Apply
                </a>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </DesignSurface>
  );
}
