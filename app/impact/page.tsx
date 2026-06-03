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
  buildPublishedImpactJsonLdStats,
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
        <span className="impact-page__stat-footnote">
          {t('avgSalaryIncreaseSample', { count: stats.salaryIncreaseSampleSize })}
        </span>
      </>
    ) : (
      <>
        {t('avgSalaryIncreaseLabel')}
        <span className="impact-page__stat-footnote">{t('avgSalaryIncreaseInsufficient')}</span>
      </>
    );

  const hasLiveData = hasPublicImpactLiveData(stats);
  const hasEnrolledCohort = hasPublicImpactEnrolledCohort(stats);
  const hasEmployerMetrics =
    stats.employersPartnered > 0 || stats.jobsPosted > 0 || stats.hiresMade > 0;

  const membersServedValue = hasLiveData ? formatThousands(stats.membersServed) : '—';
  const isUnpublishedValue = (value: string) => value === '—';

  const completionValue = hasEnrolledCohort && stats.completionRatePct > 0 ? `${stats.completionRatePct}%` : '—';
  const completionLabel = hasEnrolledCohort && stats.completionRatePct > 0 ? (
    t('completionRateLabel')
  ) : (
    <>
      {t('completionRateLabel')}
      <span className="impact-page__stat-footnote">{t('cohortRateInsufficient')}</span>
    </>
  );

  const placementValue = hasEnrolledCohort && stats.placementRatePct > 0 ? `${stats.placementRatePct}%` : '—';
  const placementLabel = hasEnrolledCohort && stats.placementRatePct > 0 ? (
    t('placementRateLabel')
  ) : (
    <>
      {t('placementRateLabel')}
      <span className="impact-page__stat-footnote">{t('cohortRateInsufficient')}</span>
    </>
  );

  const formatOptionalCount = (value: number) => (hasLiveData ? formatThousands(value) : '—');

  const programColumnHeaderStyle = {
    fontSize: '0.75rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--color-on-surface-variant)',
  } as const;

  const programColumns: DataTableColumn<ImpactProgramRow>[] = [
    {
      key: 'program',
      header: <span style={programColumnHeaderStyle}>{t('programColumn')}</span>,
      cellDataLabel: t('programColumn'),
      rowHeader: true,
      cell: (row) => <span style={{ fontWeight: 600 }}>{row.programTitle}</span>,
    },
    {
      key: 'enrolled',
      align: 'right',
      header: <span style={programColumnHeaderStyle}>{t('enrolledColumn')}</span>,
      cellDataLabel: t('enrolledColumn'),
      cell: (row) => row.enrolled,
    },
    {
      key: 'completed',
      align: 'right',
      header: <span style={programColumnHeaderStyle}>{t('completedColumn')}</span>,
      cellDataLabel: t('completedColumn'),
      cell: (row) => row.completed,
    },
    {
      key: 'avg',
      align: 'right',
      hideOnMobile: true,
      header: <span style={programColumnHeaderStyle}>{t('avgTimeColumn')}</span>,
      cellDataLabel: t('avgTimeColumn'),
      cell: (row) =>
        row.avgDaysToComplete != null
          ? t('days', { count: Math.round(row.avgDaysToComplete) })
          : t('noData'),
    },
  ];

  const datasetStats = buildPublishedImpactJsonLdStats(stats, {
    membersServed: t('membersServedLabel'),
    completionRate: t('completionRateLabel'),
    placementRate: t('placementRateLabel'),
    avgSalaryIncrease: t('avgSalaryIncreaseLabel'),
    employerPartners: t('employerPartnersLabel'),
    jobsPosted: t('jobsPostedLabel'),
    hires: t('hiresLabel'),
  });

  const statsMethodologyNote = hasLiveData ? t('statsMethodologyNote') : null;

  return (
    <div className="inner-page impact-page marketing-mobile-pb-for-bottom-nav">
      {datasetStats.length > 0 ? <JsonLdDataset stats={datasetStats} /> : null}
      <PageSection padding="lg" variant="default">
        <div className="impact-page__container">
          <SectionHeader
            eyebrow={t('eyebrow')}
            title={t('heading')}
            subtitle={t('subtitle')}
            align="left"
            marginBottom="2rem"
          />

          {!hasLiveData ? (
            <div className="impact-page__empty-hero">
              <InfoCard
                variant="bordered"
                title={t('membersServedEmptyTitle')}
                description={t('dataLightNote')}
              />
              <p className="impact-page__section-link-wrap impact-page__empty-hero-link">
                <LocalizedLink href="/employers" className="impact-page__section-link">
                  {t('employerHiringLink')}
                </LocalizedLink>
              </p>
            </div>
          ) : (
            <div className="impact-page__hero-metric portal-card portal-card--flat">
              <p className="impact-page__hero-value">{membersServedValue}</p>
              <p className="impact-page__hero-label">{t('membersServedLabel')}</p>
              <p className="impact-page__hero-desc">{t('membersServedDesc')}</p>
              <p className="impact-page__hero-as-of">{stats.asOfLabel}</p>
            </div>
          )}

          {hasLiveData ? (
            <>
              <div className="impact-page__stats-grid">
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
              {statsMethodologyNote ? (
                <p className="impact-page__methodology">{statsMethodologyNote}</p>
              ) : null}
            </>
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
        <div className="impact-page__container">
          <SectionHeader
            title={t('employersTitle')}
            subtitle={t('employersSubtitle')}
            align="left"
            marginBottom="1.5rem"
          />
          {hasEmployerMetrics ? (
            <>
              <div className="impact-page__stats-grid impact-page__stats-grid--employers">
                <StatCard value={formatOptionalCount(stats.employersPartnered)} label={t('employerPartnersLabel')} />
                <StatCard value={formatOptionalCount(stats.jobsPosted)} label={t('jobsPostedLabel')} />
                <StatCard value={formatOptionalCount(stats.hiresMade)} label={t('hiresLabel')} />
              </div>
              {hasLiveData ? (
                <p className="impact-page__employer-as-of">{stats.asOfLabel}</p>
              ) : null}
              <p className="impact-page__section-link-wrap">
                <LocalizedLink href="/employers" className="impact-page__section-link">
                  {t('employerHiringLink')}
                </LocalizedLink>
              </p>
            </>
          ) : (
            <>
              <InfoCard variant="bordered" title={t('employerMetricsEmptyTitle')} description={t('employerMetricsEmpty')} />
              <p className="impact-page__section-link-wrap">
                <LocalizedLink href="/employers" className="impact-page__section-link">
                  {t('employerHiringLink')}
                </LocalizedLink>
              </p>
            </>
          )}
        </div>
      </PageSection>

      <PageSection padding="md" ariaLabel={t('testimonialsTitle')}>
        <div className="impact-page__container">
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
        <div className="impact-page__container impact-page__container--narrow">
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

      <style>{`
        .impact-page__container {
          max-width: 75rem;
          margin: 0 auto;
        }
        .impact-page__container--narrow {
          max-width: 55rem;
        }
        .impact-page__empty-hero,
        .impact-page__hero-metric {
          margin-bottom: 2.5rem;
          border-left: 4px solid var(--color-accent);
        }
        .impact-page__empty-hero-link {
          margin: 1rem 0 0;
          padding-left: 1rem;
        }
        .impact-page__hero-metric {
          padding: clamp(1.5rem, 3vw, 2.5rem);
        }
        .impact-page__hero-value {
          margin: 0;
          font-size: clamp(2.75rem, 6vw, 4rem);
          font-weight: 900;
          color: var(--color-accent);
          line-height: 1;
        }
        .impact-page__hero-label {
          margin: 0.75rem 0 0;
          font-weight: 700;
          font-size: 1.125rem;
        }
        .impact-page__hero-desc,
        .impact-page__hero-as-of,
        .impact-page__methodology {
          margin: 0.5rem 0 0;
          font-size: 0.92rem;
          color: var(--color-on-surface-variant);
          line-height: 1.6;
        }
        .impact-page__hero-as-of {
          font-size: 0.85rem;
        }
        .impact-page__stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          margin-bottom: 3rem;
        }
        .impact-page__stats-grid--employers {
          margin-bottom: 0;
        }
        .impact-page__stat-footnote {
          display: block;
          margin-top: 0.5rem;
          font-size: 0.8rem;
          font-weight: 400;
          line-height: 1.45;
        }
        .impact-page__methodology {
          margin: 0.75rem 0 2.5rem;
          font-size: 0.8125rem;
          max-width: 42rem;
        }
        .impact-page__employer-as-of {
          margin: 0.75rem 0 0;
          font-size: 0.8125rem;
          color: var(--color-on-surface-variant);
          line-height: 1.5;
        }
        .impact-page__section-link-wrap {
          margin: 1rem 0 0;
        }
        .impact-page__section-link {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-accent);
          text-decoration: none;
        }
        .impact-page__section-link:hover {
          text-decoration: underline;
        }
        .impact-page .testimonials-carousel__grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
        @media (min-width: 640px) {
          .impact-page__stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          }
          .impact-page__stats-grid--employers {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }
          .impact-page .testimonials-carousel__grid {
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 17.5rem), 1fr));
          }
        }
      `}</style>

      <DynamicFooter />
      <DynamicMobileBottomNav />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
