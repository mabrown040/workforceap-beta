import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import DataTable, { type DataTableColumn } from '@/components/portal/ui/DataTable';
import { SectionHeader, StatCard, InfoCard, PageSection } from '@/components/marketing/ui';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';
import {
  EMPTY_PUBLIC_IMPACT_STATS,
  getPublicImpactStats,
  type ImpactProgramRow,
} from '@/lib/marketing/publicImpactStats';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Public impact · Workforce Advancement Project',
    description:
      'Live WorkforceAP outcomes: members served, training completion, job placement, program results, and employer partnership stats.',
    path: '/impact',
  });
}

export const revalidate = 600;

function formatThousands(n: number): string {
  return n.toLocaleString('en-US');
}

export default async function ImpactPage() {
  let stats: Awaited<ReturnType<typeof getPublicImpactStats>>;

  if (shouldSkipOptionalDbQueriesAtBuild()) {
    stats = await getPublicImpactStats('build');
  } else {
    try {
      const orgId = await getDefaultOrganizationId();
      stats = await getPublicImpactStats(orgId);
    } catch {
      stats = EMPTY_PUBLIC_IMPACT_STATS;
    }
  }

  const salaryValue =
    stats.avgSalaryIncreaseDollars != null && stats.salaryIncreaseSampleSize > 0 ? (
      <>
        +$
        {Math.round(stats.avgSalaryIncreaseDollars).toLocaleString('en-US')}
      </>
    ) : (
      '—'
    );

  const salaryLabel =
    stats.salaryIncreaseSampleSize > 0 ? (
      <>
        Avg. salary increase
        <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 400 }}>
          From placement offer to follow-up wage (where both are on file; n={stats.salaryIncreaseSampleSize})
        </span>
      </>
    ) : (
      <>
        Avg. salary increase
        <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 400 }}>
          Reported after placement follow-ups; insufficient paired data to show an average yet.
        </span>
      </>
    );

  const programColumns: DataTableColumn<ImpactProgramRow>[] = [
    {
      key: 'program',
      header: (
        <span
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-on-surface-variant)',
          }}
        >
          Program
        </span>
      ),
      rowHeader: true,
      cell: (row) => <span style={{ fontWeight: 600 }}>{row.programTitle}</span>,
    },
    {
      key: 'enrolled',
      align: 'right',
      header: (
        <span
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-on-surface-variant)',
          }}
        >
          Enrolled
        </span>
      ),
      cell: (row) => row.enrolled,
    },
    {
      key: 'completed',
      align: 'right',
      header: (
        <span
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-on-surface-variant)',
          }}
        >
          Completed
        </span>
      ),
      cell: (row) => row.completed,
    },
    {
      key: 'avg',
      align: 'right',
      header: (
        <span
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-on-surface-variant)',
          }}
        >
          Avg. time to complete
        </span>
      ),
      cell: (row) => (row.avgDaysToComplete != null ? `${Math.round(row.avgDaysToComplete)} days` : '—'),
    },
  ];

  return (
    <div className="inner-page marketing-mobile-pb-for-bottom-nav">
      <PageSection padding="lg" variant="default">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader
            eyebrow="Live statistics"
            title={<>Real outcomes for real people</>}
            subtitle="WorkforceAP impact metrics drawn from our operational systems—shared on a short cache interval for public transparency."
            align="left"
            marginBottom="2rem"
          />

          <div
            className="portal-card portal-card--flat"
            style={{
              padding: 'clamp(1.5rem, 3vw, 2.5rem)',
              marginBottom: '2.5rem',
              borderLeft: '4px solid var(--color-accent)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 'clamp(2.75rem, 6vw, 4rem)',
                fontWeight: 900,
                color: 'var(--color-accent)',
                lineHeight: 1,
              }}
            >
              {formatThousands(stats.membersServed)}
            </p>
            <p style={{ margin: '0.75rem 0 0', fontWeight: 700, fontSize: '1.125rem' }}>Members served</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.92rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
              Active member accounts (profile role &ldquo;member&rdquo;), default WorkforceAP organization. Test fixtures are
              excluded.
            </p>
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{stats.asOfLabel}</p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '3rem',
            }}
          >
            <StatCard value={`${stats.completionRatePct}%`} label="Completion rate (enrolled cohort)" />
            <StatCard value={`${stats.placementRatePct}%`} label="Placement rate (enrolled cohort)" />
            <StatCard value={salaryValue} label={salaryLabel} />
          </div>
        </div>
      </PageSection>

      <PageSection padding="md" variant="dark" ariaLabel="Programs">
        <SectionHeader
          title="Programs"
          subtitle="Per-program enrollment, curriculum completion, and typical time to complete (where completion timestamps are available)."
          align="left"
          marginBottom="1.5rem"
        />
        {stats.programs.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-variant)' }}>No enrolled program cohorts recorded yet.</p>
        ) : (
          <DataTable<ImpactProgramRow> rows={stats.programs} rowKey={(row) => row.programSlug} density="standard" columns={programColumns} />
        )}
      </PageSection>

      <PageSection padding="md" ariaLabel="Employers">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader
            title="Employers"
            subtitle="Employer partners and roles moving through the curated job pipeline (excludes draft and pending review)."
            align="left"
            marginBottom="1.5rem"
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            <StatCard value={formatThousands(stats.employersPartnered)} label="Employer partners (active)" />
            <StatCard value={formatThousands(stats.jobsPosted)} label="Jobs posted (approved, live, filled, or closed)" />
            <StatCard value={formatThousands(stats.hiresMade)} label="Hires on file (placement records)" />
          </div>
        </div>
      </PageSection>

      <PageSection padding="md" variant="dark" ariaLabel="Funders">
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <SectionHeader title="Funders" align="left" marginBottom="1rem" />
          <InfoCard
            variant="flat"
            eyebrow="Nonprofit model"
            title="Grant-funded access"
            description="WorkforceAP is a 501(c)(3) nonprofit. Funded by grants and partners, no cost to qualifying members."
          />
          <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link href="/outcomes" className="btn btn-outline">
              Placement outcomes detail
            </Link>
            <Link href="/apply" className="btn btn-primary">
              Apply
            </Link>
          </div>
        </div>
      </PageSection>

      <Footer />
      <MobileBottomNav />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
