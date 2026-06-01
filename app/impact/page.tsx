import type { Metadata } from 'next';
import LocalizedLink from '@/components/LocalizedLink';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadataAsync } from '@/app/seo';
import { DynamicFooter, DynamicMobileBottomNav } from '@/components/marketing/dynamicMarketingChrome';
import DataTable, { type DataTableColumn } from '@/components/portal/ui/DataTable';
import { SectionHeader, StatCard, InfoCard, PageSection } from '@/components/marketing/ui';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';
import {
  EMPTY_PUBLIC_IMPACT_STATS,
  getPublicImpactStats,
  hasPublicImpactEnrolledCohort,
  hasPublicImpactLiveData,
  type ImpactProgramRow,
} from '@/lib/marketing/publicImpactStats';
import JsonLdDataset from '@/components/JsonLdDataset';
import TestimonialsCarousel from '@/components/marketing/TestimonialsCarousel';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.publicImpact');
  const stats = await (async () => {
    if (shouldSkipOptionalDbQueriesAtBuild()) return EMPTY_PUBLIC_IMPACT_STATS;
    try {
      const orgId = await getDefaultOrganizationId();
      return await getPublicImpactStats(orgId);
    } catch {
      return EMPTY_PUBLIC_IMPACT_STATS;
    }
  })();
  const hasLiveData = hasPublicImpactLiveData(stats);
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/impact',
    robots: hasLiveData ? undefined : { index: false },
  });
}

export const revalidate = 600;

function formatThousands(n: number): string {
  return n.toLocaleString('en-US');
}

export default async function ImpactPage() {
  const t = await getTranslations('marketing.publicImpact');
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
    stats.salaryIncreaseSampleSize > 0 && stats.avgSalaryIncreaseDollars != null ? (
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
        {t('avgSalaryIncreaseLabel')}
        <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 400 }}>
          {t('avgSalaryIncreaseSample', { count: stats.salaryIncreaseSampleSize })}
        </span>
      </>
    ) : (
      <>
        {t('avgSalaryIncreaseLabel')}
        <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 400 }}>
          {t('avgSalaryIncreaseInsufficient')}
        </span>
      </>
    );

  const hasLiveData = hasPublicImpactLiveData(stats);
  const hasEnrolledCohort = hasPublicImpactEnrolledCohort(stats);
  const hasEmployerMetrics =
    stats.employersPartnered > 0 || stats.jobsPosted > 0 || stats.hiresMade > 0;

  const membersServedValue = hasLiveData ? formatThousands(stats.membersServed) : '—';
  const isUnpublishedValue = (value: string) => value === '—';

  const rateFootnoteStyle = {
    display: 'block',
    marginTop: '0.5rem',
    fontSize: '0.8rem',
    fontWeight: 400,
  } as const;

  const completionValue = hasEnrolledCohort && stats.completionRatePct > 0 ? `${stats.completionRatePct}%` : '—';
  const completionLabel = hasEnrolledCohort && stats.completionRatePct > 0 ? (
    t('completionRateLabel')
  ) : (
    <>
      {t('completionRateLabel')}
      <span style={rateFootnoteStyle}>{t('cohortRateInsufficient')}</span>
    </>
  );

  const placementValue = hasEnrolledCohort && stats.placementRatePct > 0 ? `${stats.placementRatePct}%` : '—';
  const placementLabel = hasEnrolledCohort && stats.placementRatePct > 0 ? (
    t('placementRateLabel')
  ) : (
    <>
      {t('placementRateLabel')}
      <span style={rateFootnoteStyle}>{t('cohortRateInsufficient')}</span>
    </>
  );

  const formatOptionalCount = (value: number) => (hasLiveData ? formatThousands(value) : '—');

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
          {t('programColumn')}
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
          {t('enrolledColumn')}
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
          {t('completedColumn')}
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
          {t('avgTimeColumn')}
        </span>
      ),
      cell: (row) =>
        row.avgDaysToComplete != null
          ? t('days', { count: Math.round(row.avgDaysToComplete) })
          : t('noData'),
    },
  ];

  const datasetStats = [
    { label: t('membersServedLabel'), value: formatThousands(stats.membersServed) },
    { label: t('completionRateLabel'), value: `${stats.completionRatePct}%` },
    { label: t('placementRateLabel'), value: `${stats.placementRatePct}%` },
    { label: t('employerPartnersLabel'), value: formatThousands(stats.employersPartnered) },
    { label: t('jobsPostedLabel'), value: formatThousands(stats.jobsPosted) },
    { label: t('hiresLabel'), value: formatThousands(stats.hiresMade) },
  ];

  return (
    <div className="inner-page marketing-mobile-pb-for-bottom-nav">
      {hasLiveData ? <JsonLdDataset stats={datasetStats} /> : null}
      <PageSection padding="lg" variant="default">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader
            eyebrow={t('eyebrow')}
            title={t('heading')}
            subtitle={t('subtitle')}
            align="left"
            marginBottom="2rem"
          />

          {!hasLiveData ? (
            <div style={{ marginBottom: '2.5rem', borderLeft: '4px solid var(--color-accent)' }}>
              <InfoCard
                variant="bordered"
                title={t('membersServedEmptyTitle')}
                description={t('dataLightNote')}
              />
            </div>
          ) : (
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
                {membersServedValue}
              </p>
              <p style={{ margin: '0.75rem 0 0', fontWeight: 700, fontSize: '1.125rem' }}>
                {t('membersServedLabel')}
              </p>
              <p
                style={{
                  margin: '0.5rem 0 0',
                  fontSize: '0.92rem',
                  color: 'var(--color-on-surface-variant)',
                  lineHeight: 1.6,
                }}
              >
                {t('membersServedDesc')}
              </p>
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                {stats.asOfLabel}
              </p>
            </div>
          )}

          {hasLiveData ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                marginBottom: '3rem',
              }}
            >
              <StatCard
                value={completionValue}
                label={completionLabel}
                unpublished={isUnpublishedValue(String(completionValue))}
              />
              <StatCard
                value={placementValue}
                label={placementLabel}
                unpublished={isUnpublishedValue(String(placementValue))}
              />
              <StatCard
                value={salaryValue}
                label={salaryLabel}
                unpublished={salaryValue === '—'}
              />
            </div>
          ) : null}
        </div>
      </PageSection>

      <PageSection padding="md" variant="dark" ariaLabel={t('programsTitle')}>
        <SectionHeader
          title={t('programsTitle')}
          subtitle={t('programsSubtitle')}
          align="left"
          marginBottom="1.5rem"
        />
        {stats.programs.length === 0 ? (
          <InfoCard variant="bordered" title={t('noProgramsTitle')} description={t('noPrograms')} />
        ) : (
          <DataTable<ImpactProgramRow>
            rows={stats.programs}
            rowKey={(row) => row.programSlug}
            density="standard"
            columns={programColumns}
          />
        )}
      </PageSection>

      <PageSection padding="md" ariaLabel={t('employersTitle')}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader
            title={t('employersTitle')}
            subtitle={t('employersSubtitle')}
            align="left"
            marginBottom="1.5rem"
          />
          {hasEmployerMetrics ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              <StatCard value={formatOptionalCount(stats.employersPartnered)} label={t('employerPartnersLabel')} />
              <StatCard value={formatOptionalCount(stats.jobsPosted)} label={t('jobsPostedLabel')} />
              <StatCard value={formatOptionalCount(stats.hiresMade)} label={t('hiresLabel')} />
            </div>
          ) : (
            <InfoCard variant="bordered" title={t('employerMetricsEmptyTitle')} description={t('employerMetricsEmpty')} />
          )}
        </div>
      </PageSection>

      <PageSection padding="md" ariaLabel={t('testimonialsTitle')}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader
            title={t('testimonialsTitle')}
            subtitle={t('testimonialsSubtitle')}
            align="left"
            marginBottom="1.5rem"
          />
          <TestimonialsCarousel />
        </div>
      </PageSection>

      <PageSection padding="md" variant="dark" ariaLabel={t('fundersTitle')}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <SectionHeader title={t('fundersTitle')} align="left" marginBottom="1rem" />
          <InfoCard
            variant="flat"
            eyebrow={t('nonprofitModelEyebrow')}
            title={t('grantFundedTitle')}
            description={t('grantFundedDesc')}
          />
          <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <LocalizedLink href="/outcomes" className="btn btn-outline">
              {t('outcomesLink')}
            </LocalizedLink>
            <LocalizedLink href="/apply" className="btn btn-primary">
              {t('applyCta')}
            </LocalizedLink>
          </div>
        </div>
      </PageSection>

      <DynamicFooter />
      <DynamicMobileBottomNav />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
