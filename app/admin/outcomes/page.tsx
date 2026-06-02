import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import DataTable from '@/components/portal/ui/DataTable';
import { getPublicPlacementOutcomes, wilsonInterval } from '@/lib/outcomes/publicPlacementOutcomes';
import { getBoardSnapshot, SMALL_SAMPLE_THRESHOLD } from '@/lib/admin/boardOutcomes';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Outcomes truth-set',
  description: 'Single source of truth for any external pitch — applications, training, placements, certifications, and data-quality flags.',
  path: '/admin/outcomes',
});

export const dynamic = 'force-dynamic';

const cardStyle = {
  padding: '1rem 1.25rem',
} as const;

const sectionGrid = {
  display: 'grid',
  gap: '1rem',
  maxWidth: 1024,
} as const;

const statRow = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '0.75rem',
  marginTop: '0.5rem',
} as const;

const statBlock = {
  padding: '0.75rem',
  borderRadius: 8,
  background: 'var(--color-surface-variant, #f5f5f5)',
} as const;

const statLabel = {
  fontSize: '0.8rem',
  color: 'var(--color-on-surface-variant)',
  margin: 0,
} as const;

const statValue = {
  fontSize: '1.5rem',
  fontWeight: 600,
  margin: '0.25rem 0 0',
} as const;

const sourceNote = {
  margin: '0.75rem 0 0',
  fontSize: '0.8rem',
  color: 'var(--color-on-surface-variant)',
  fontStyle: 'italic',
} as const;

function formatRate(numerator: number, denominator: number): string {
  if (denominator < SMALL_SAMPLE_THRESHOLD) {
    return `N=${denominator} · sample too small for a reliable rate`;
  }
  const pct = Math.round((numerator / denominator) * 100);
  return `${pct}% (${numerator} / ${denominator})`;
}

export default async function AdminOutcomesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/outcomes');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const orgId = await getActorOrganizationId(user.id);
  const superUser = await isSuperAdmin(user.id);

  const [snapshot, placementBundle] = await Promise.all([
    getBoardSnapshot('all-time', superUser ? undefined : orgId),
    getPublicPlacementOutcomes(prisma),
  ]);

  const wilson =
    placementBundle.totalPlaced > 0
      ? wilsonInterval(placementBundle.withRetentionNote, placementBundle.totalPlaced)
      : null;

  const t = snapshot.outcomes.totals;
  const generatedAtLabel = snapshot.generatedAt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <PortalPageFrame>
      <PageHeader
        title="Outcomes truth-set"
        subtitle="Single source of truth for any external pitch. Every number here is sourced from a documented Prisma query."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Outcomes' }]}
      />

      <div style={sectionGrid}>
        <section
          className="content-card"
          style={{
            ...cardStyle,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
              Generated {generatedAtLabel}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
              Period: {snapshot.outcomes.period.label} · Threshold for rate suppression:
              N&lt;{SMALL_SAMPLE_THRESHOLD}
            </p>
          </div>
          <a
            href="/api/admin/outcomes/snapshot"
            className="cta-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Download snapshot (Markdown)
          </a>
        </section>

        {/* 1. Application funnel */}
        <section className="content-card" style={cardStyle}>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem' }}>1. Application funnel</h2>
          <p style={statLabel}>Top-of-funnel before enrollment.</p>
          <div style={statRow}>
            <div style={statBlock}>
              <p style={statLabel}>Total applications</p>
              <p style={statValue}>{snapshot.applicationFunnel.total}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Pending review</p>
              <p style={statValue}>{snapshot.applicationFunnel.pending}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Approved</p>
              <p style={statValue}>{snapshot.applicationFunnel.approved}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Needs info</p>
              <p style={statValue}>{snapshot.applicationFunnel.needsInfo}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Denied</p>
              <p style={statValue}>{snapshot.applicationFunnel.denied}</p>
            </div>
          </div>
          <p style={sourceNote}>Source: <code>applications</code> table grouped by <code>status</code>.</p>
        </section>

        {/* 2. Member outcomes funnel */}
        <section className="content-card" style={cardStyle}>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem' }}>2. Member outcomes funnel</h2>
          <p style={statLabel}>From enrollment through placement.</p>
          <div style={statRow}>
            <div style={statBlock}>
              <p style={statLabel}>Enrolled</p>
              <p style={statValue}>{t.membersEnrolled}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>In training</p>
              <p style={statValue}>{t.membersInTraining}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Certified</p>
              <p style={statValue}>{t.membersCertified}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Placed</p>
              <p style={statValue}>{t.membersPlaced}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Median salary</p>
              <p style={statValue}>
                {t.medianAnnualSalary === null ? '—' : `$${t.medianAnnualSalary.toLocaleString('en-US')}`}
              </p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Avg weeks to placement</p>
              <p style={statValue}>
                {t.averageWeeksToPlacement === null ? '—' : `${t.averageWeeksToPlacement}`}
              </p>
            </div>
          </div>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.95rem' }}>
            <strong>Placement rate:</strong> {formatRate(t.membersPlaced, t.membersEnrolled)}
          </p>
          {wilson && placementBundle.totalPlaced >= SMALL_SAMPLE_THRESHOLD ? (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
              Wilson 95% interval on follow-up rate: {Math.round(wilson.low * 100)}% –{' '}
              {Math.round(wilson.high * 100)}%
            </p>
          ) : null}
          <p style={sourceNote}>
            Source: <code>users</code> (enrolled) joined with <code>placement_records</code> and program progress rollups.
          </p>
        </section>

        {/* 3. Activity */}
        <section className="content-card" style={cardStyle}>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem' }}>3. Member activity</h2>
          <p style={statLabel}>Engagement signal from member_events.</p>
          <div style={statRow}>
            <div style={statBlock}>
              <p style={statLabel}>Total members</p>
              <p style={statValue}>{snapshot.activity.totalMembers}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Active 7d</p>
              <p style={statValue}>{snapshot.activity.active7d}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Active 14d</p>
              <p style={statValue}>{snapshot.activity.active14d}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Active 30d</p>
              <p style={statValue}>{snapshot.activity.active30d}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Inactive 14+ days</p>
              <p style={statValue}>{snapshot.activity.inactive14d}</p>
            </div>
          </div>
          <p style={sourceNote}>
            Source: distinct <code>user_id</code> from <code>member_events</code> within each window.
          </p>
        </section>

        {/* 4. Certifications */}
        <section className="content-card" style={cardStyle}>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem' }}>4. Certifications earned</h2>
          <div style={statRow}>
            <div style={statBlock}>
              <p style={statLabel}>Total earned</p>
              <p style={statValue}>{snapshot.certifications.totalEarned}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Last 30 days</p>
              <p style={statValue}>{snapshot.certifications.earnedLast30d}</p>
            </div>
            <div style={statBlock}>
              <p style={statLabel}>Unique members</p>
              <p style={statValue}>{snapshot.certifications.uniqueMembers}</p>
            </div>
          </div>
          <p style={sourceNote}>Source: <code>user_certifications</code> table.</p>
        </section>

        {/* 5. Programs */}
        <section className="content-card" style={cardStyle}>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem' }}>5. Programs</h2>
          {snapshot.outcomes.programs.length === 0 ? (
            <p style={{ margin: '0.5rem 0 0', color: 'var(--color-on-surface-variant)' }}>
              No enrolled members yet.
            </p>
          ) : (
            <div style={{ overflowX: 'auto', maxWidth: '100%', minWidth: 0, marginTop: '0.5rem', WebkitOverflowScrolling: 'touch' }}>
              <DataTable
                density="compact"
                scrollX={false}
                rows={snapshot.outcomes.programs}
                rowKey={(p) => p.programSlug}
                columns={[
                  { key: 'program', header: 'Program', cell: (p) => p.programSlug },
                  { key: 'enrolled', header: 'Enrolled', align: 'right', cell: (p) => p.enrolled },
                  { key: 'certified', header: 'Certified', align: 'right', cell: (p) => p.certified },
                  { key: 'placed', header: 'Placed', align: 'right', cell: (p) => p.placed },
                  {
                    key: 'rate',
                    header: 'Placement rate',
                    align: 'right',
                    cell: (p) =>
                      p.enrolled < SMALL_SAMPLE_THRESHOLD ? `N=${p.enrolled}` : `${p.placementRate}%`,
                  },
                ]}
              />
            </div>
          )}
          <p style={sourceNote}>
            Source: <code>users.enrolled_program</code> joined with <code>placement_records</code>.
          </p>
        </section>

        {/* 6. Data quality */}
        <section className="content-card" style={cardStyle}>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem' }}>6. Data quality flags</h2>
          <p style={statLabel}>
            Rows that exist in production but are missing fields a WIOA reviewer or board funder
            will likely ask about. Fix these before any external review.
          </p>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', lineHeight: 1.7 }}>
            <li>Placements missing program slug: <strong>{snapshot.dataQuality.placementsMissingProgram}</strong></li>
            <li>Placements missing funding source: <strong>{snapshot.dataQuality.placementsMissingFunding}</strong></li>
            <li>Placements missing retention status / decision: <strong>{snapshot.dataQuality.placementsMissingRetention}</strong></li>
            <li>Placements missing salary at placement: <strong>{snapshot.dataQuality.placementsMissingSalary}</strong></li>
            <li>Enrolled members missing <code>enrolled_at</code>: <strong>{snapshot.dataQuality.enrolledWithoutEnrolledAt}</strong></li>
          </ul>
        </section>

        <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
          Methodology: <Link href="/admin/outcomes/methodology">Outcomes methodology</Link>{' '}
          · Public mirror: <Link href="/outcomes">/outcomes</Link>
        </p>
      </div>
    </PortalPageFrame>
  );
}
