import { Briefcase, Compass, Sparkles } from 'lucide-react';
import NextLink from 'next/link';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Token, type TokenColor } from '@astryxdesign/core/Token';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
import { DesignSurface, KpiStrip, DataTable, type Column, type KitTone } from '@/components/portal/kit';
import { JOBS_EMPTY_RECOMMENDATIONS } from '@/lib/member/jobPipelineDisplay';

/** Maps the kit's semantic tone (StatusTag's palette) to the closest Token color. */
function tokenColorForTone(tone: KitTone): TokenColor {
  switch (tone) {
    case 'ok':
      return 'green';
    case 'warn':
      return 'yellow';
    case 'alert':
      return 'pink';
    case 'danger':
      return 'red';
    case 'info':
      return 'blue';
    case 'muted':
    default:
      return 'gray';
  }
}

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
  profileHref?: string;
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
  profileHref = '/dashboard/profile',
  applications = DEFAULT_APPLICATIONS,
  recommended = [],
}: MemberJobsKitProps) {
  const columns: Column<ApplicationRow>[] = [
    { key: 'role', header: 'Role', render: (r) => <span style={{ fontWeight: 700 }}>{r.role}</span> },
    { key: 'company', header: 'Company', render: (r) => <span style={{ color: 'var(--wa-muted)' }}>{r.company}</span> },
    { key: 'location', header: 'Location', render: (r) => <span style={{ color: 'var(--wa-muted)' }}>{r.location}</span> },
    { key: 'applied', header: 'Applied', render: (r) => <span style={{ color: 'var(--wa-muted)', fontVariantNumeric: 'tabular-nums' }}>{r.applied}</span> },
    { key: 'stage', header: 'Stage', align: 'right', render: (r) => <Token label={r.stage} size="sm" color={tokenColorForTone(r.tone)} /> },
  ];
  const applicationCard = (row: ApplicationRow) => (
    <Card>
      <div className="wa-flex wa-items-start wa-justify-between wa-gap-3">
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--wa-text)' }}>{row.role}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: 'var(--wa-muted)' }}>{row.company}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: 'var(--wa-muted)' }}>
            {row.location} · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.applied}</span>
          </div>
        </div>
        <Token label={row.stage} size="sm" color={tokenColorForTone(row.tone)} />
      </div>
    </Card>
  );

  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }} className="wa-space-y-6">
        {/* Page opener — eyebrow + title so the tab reads as an intentional
            page rather than a floating widget (matches VoiceStudioKit idiom). */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--wa-accent)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <Compass size={13} aria-hidden="true" />
            <span>Job search</span>
          </div>
          <h1
            className="h-font"
            style={{ fontSize: 'clamp(22px, 6vw, 30px)', marginTop: 4, fontWeight: 800, letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            Job Pipeline
          </h1>
          <p style={{ fontSize: 14, color: 'var(--wa-muted)', marginTop: 4 }}>
            Track applications, discover new roles, and keep momentum toward an offer.
          </p>
        </div>
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
        <Card>
          <div className="wa-flex wa-flex-col md:wa-flex-row md:wa-items-center wa-justify-between wa-gap-3" style={{ marginBottom: 16 }}>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>Application Pipeline</h2>
              <p style={{ fontSize: 12, color: 'var(--wa-muted)' }}>{syncedLabel}</p>
            </div>
            <AstryxLink href={browseHref} as={NextLink as never} isStandalone>
              <Button label="Browse Job Board" variant="primary" size="sm" />
            </AstryxLink>
          </div>
          {applications.length === 0 ? (
            <EmptyState
              icon={<Briefcase size={28} aria-hidden="true" style={{ color: 'var(--wa-accent)' }} />}
              title="No applications yet"
              description="Track jobs you apply to and they'll show up here."
              actions={
                <AstryxLink href={browseHref} as={NextLink as never} isStandalone>
                  <Button label="Browse Job Board" variant="primary" size="sm" />
                </AstryxLink>
              }
            />
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
        </Card>

        {/* Recommended for you */}
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', marginBottom: 16 }}>Recommended for you</h2>
          {recommended.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={28} aria-hidden="true" style={{ color: 'var(--wa-accent)' }} />}
              title={JOBS_EMPTY_RECOMMENDATIONS.title}
              description={JOBS_EMPTY_RECOMMENDATIONS.description}
              actions={
                <>
                  <AstryxLink href={profileHref} as={NextLink as never} isStandalone>
                    <Button label={JOBS_EMPTY_RECOMMENDATIONS.primaryCta} variant="primary" size="sm" />
                  </AstryxLink>
                  <AstryxLink href={browseHref} as={NextLink as never} isStandalone>
                    <Button label={JOBS_EMPTY_RECOMMENDATIONS.secondaryCta} variant="secondary" size="sm" />
                  </AstryxLink>
                </>
              }
            />
          ) : (
          <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-4">
            {recommended.map((job) => (
              <Card key={job.id}>
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
                <div style={{ marginTop: 12 }}>
                  <AstryxLink href={`/dashboard/jobs/${job.id}`} as={NextLink as never} isStandalone>
                    <Button label="Quick Apply" variant="secondary" size="sm" style={{ width: '100%' }} />
                  </AstryxLink>
                </div>
              </Card>
            ))}
          </div>
          )}
        </div>
      </div>
    </DesignSurface>
  );
}
