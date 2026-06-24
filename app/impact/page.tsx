import '@/css/marketing-v3-impact.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import LocalizedLink from '@/components/LocalizedLink';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadataAsync } from '@/app/seo';
import { DynamicFooter, DynamicMobileBottomNav } from '@/components/marketing/dynamicMarketingChrome';
import DataTable, { type DataTableColumn } from '@/components/portal/ui/DataTable';
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
    description: hasLiveData ? t('description') : t('descriptionDataLight'),
    path: '/impact',
    robots: hasLiveData ? undefined : { index: false },
  });
}

export const revalidate = 600;

function formatThousands(n: number): string {
  return n.toLocaleString('en-US');
}

/** Inline arrow icon for "section" links (replaces the old text/emoji). */
function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
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
        <span className="wa-footnote">
          {t('avgSalaryIncreaseSample', { count: stats.salaryIncreaseSampleSize })}
        </span>
      </>
    ) : (
      <>
        {t('avgSalaryIncreaseLabel')}
        <span className="wa-footnote">{t('avgSalaryIncreaseInsufficient')}</span>
      </>
    );

  const hasLiveData = hasPublicImpactLiveData(stats);
  const hasEnrolledCohort = hasPublicImpactEnrolledCohort(stats);
  const hasEmployerMetrics =
    stats.employersPartnered > 0 || stats.jobsPosted > 0 || stats.hiresMade > 0;

  const membersServedValue = hasLiveData ? formatThousands(stats.membersServed) : '—';

  const completionValue =
    hasEnrolledCohort && stats.completionRatePct > 0 ? `${stats.completionRatePct}%` : '—';
  const completionLabel =
    hasEnrolledCohort && stats.completionRatePct > 0 ? (
      t('completionRateLabel')
    ) : (
      <>
        {t('completionRateLabel')}
        <span className="wa-footnote">{t('cohortRateInsufficient')}</span>
      </>
    );

  const placementValue =
    hasEnrolledCohort && stats.placementRatePct > 0 ? `${stats.placementRatePct}%` : '—';
  const placementLabel =
    hasEnrolledCohort && stats.placementRatePct > 0 ? (
      t('placementRateLabel')
    ) : (
      <>
        {t('placementRateLabel')}
        <span className="wa-footnote">{t('cohortRateInsufficient')}</span>
      </>
    );

  const formatOptionalCount = (value: number) => (hasLiveData ? formatThousands(value) : '—');

  const programColumns: DataTableColumn<ImpactProgramRow>[] = [
    {
      key: 'program',
      header: t('programColumn'),
      cellDataLabel: t('programColumn'),
      rowHeader: true,
      cell: (row) => <span style={{ fontWeight: 600 }}>{row.programTitle}</span>,
    },
    {
      key: 'enrolled',
      align: 'right',
      header: t('enrolledColumn'),
      cellDataLabel: t('enrolledColumn'),
      cell: (row) => row.enrolled,
    },
    {
      key: 'completed',
      align: 'right',
      header: t('completedColumn'),
      cellDataLabel: t('completedColumn'),
      cell: (row) => row.completed,
    },
    {
      key: 'avg',
      align: 'right',
      hideOnMobile: true,
      header: t('avgTimeColumn'),
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

  const statsMethodologyNote = hasLiveData ? t('statsMethodologyNote') : t('dataLightNote');
  const statNotPublishedHint = t('statNotPublished');

  /** Reskinned stat card. Renders the "not published yet" pill when value is a dash. */
  const StatCardV3 = ({ value, label }: { value: ReactNode; label: ReactNode }) => {
    const unpublished = value === '—';
    return (
      <div className="wa-stat-card">
        <p className={unpublished ? 'wa-sv wa-empty' : 'wa-sv'}>{value}</p>
        <div className="wa-sl">{label}</div>
        {unpublished ? <span className="wa-pill">{statNotPublishedHint}</span> : null}
      </div>
    );
  };

  return (
    <div className="wa-v3 inner-page impact-page marketing-mobile-pb-for-bottom-nav">
      {datasetStats.length > 0 ? <JsonLdDataset stats={datasetStats} /> : null}

      {/* HERO + MEMBERS SERVED METRIC */}
      <header className="wa-impact-hero">
        <div className="wa-wrap">
          <span className="wa-eyebrow">{hasLiveData ? t('eyebrow') : t('eyebrowDataLight')}</span>
          <h1>{t('heading')}</h1>
          <p className="wa-lede">{hasLiveData ? t('subtitle') : t('subtitleDataLight')}</p>

          {!hasLiveData ? (
            <div className="wa-hero-metric">
              <p className="wa-v wa-empty" aria-label={statNotPublishedHint}>
                —
              </p>
              <p className="wa-lbl">{t('membersServedEmptyTitle')}</p>
              <p className="wa-desc">{t('membersServedEmptyDesc')}</p>
              <LocalizedLink
                href="/employers"
                className="wa-section-link"
                style={{ color: 'var(--wa-gold-soft)' }}
              >
                {t('employerHiringLink')}
                <ArrowRightIcon />
              </LocalizedLink>
            </div>
          ) : (
            <div className="wa-hero-metric">
              <p className="wa-v">{membersServedValue}</p>
              <p className="wa-lbl">{t('membersServedLabel')}</p>
              <p className="wa-desc">{t('membersServedDesc')}</p>
              <p className="wa-as-of">{stats.asOfLabel}</p>
            </div>
          )}
        </div>
      </header>

      {/* COHORT METRICS */}
      <section className="wa-iband" aria-labelledby="impact-cohort-preview-heading">
        <div className="wa-wrap">
          {!hasLiveData ? (
            <div className="wa-preview-panel">
              <p id="impact-cohort-preview-heading" className="wa-preview-heading">
                {t('metricsPreviewHeading')}
              </p>
              <div className="wa-stat-grid">
                <StatCardV3 value={completionValue} label={completionLabel} />
                <StatCardV3 value={placementValue} label={placementLabel} />
                <StatCardV3 value={salaryValue} label={salaryLabel} />
              </div>
              <p className="wa-methodology">{statsMethodologyNote}</p>
            </div>
          ) : (
            <>
              <div className="wa-stat-grid">
                <StatCardV3 value={completionValue} label={completionLabel} />
                <StatCardV3 value={placementValue} label={placementLabel} />
                <StatCardV3 value={salaryValue} label={salaryLabel} />
              </div>
              <p className="wa-methodology">{statsMethodologyNote}</p>
            </>
          )}
        </div>
      </section>

      {/* PROGRAMS */}
      <section
        className={hasLiveData ? 'wa-iband wa-iband--dark' : 'wa-iband wa-iband--surface'}
        aria-label={t('programsTitle')}
      >
        <div className="wa-wrap">
          <div className="wa-sec-head wa-impact-head">
            <h2>{t('programsTitle')}</h2>
            <p>{hasLiveData ? t('programsSubtitle') : t('programsSubtitleDataLight')}</p>
          </div>
          {stats.programs.length === 0 ? (
            <div className="wa-info-card">
              <h3>{t('noProgramsTitle')}</h3>
              <p>{t('noPrograms')}</p>
            </div>
          ) : (
            <div className="wa-ptable-wrap">
              <DataTable<ImpactProgramRow>
                rows={stats.programs}
                rowKey={(row) => row.programSlug}
                density="standard"
                scrollX={false}
                columns={programColumns}
              />
            </div>
          )}
        </div>
      </section>

      {/* EMPLOYERS */}
      <section className="wa-iband" aria-label={t('employersTitle')}>
        <div className="wa-wrap">
          <div className="wa-sec-head wa-impact-head">
            <h2>{t('employersTitle')}</h2>
            <p>
              {hasLiveData && hasEmployerMetrics
                ? t('employersSubtitle')
                : t('employersSubtitleDataLight')}
            </p>
          </div>
          {hasLiveData && hasEmployerMetrics ? (
            <>
              <div className="wa-stat-grid">
                <StatCardV3
                  value={formatOptionalCount(stats.employersPartnered)}
                  label={t('employerPartnersLabel')}
                />
                <StatCardV3
                  value={formatOptionalCount(stats.jobsPosted)}
                  label={t('jobsPostedLabel')}
                />
                <StatCardV3 value={formatOptionalCount(stats.hiresMade)} label={t('hiresLabel')} />
              </div>
              <p className="wa-methodology">{stats.asOfLabel}</p>
              <p className="wa-methodology">{t('employerMetricsFootnote')}</p>
              <LocalizedLink href="/employers" className="wa-section-link">
                {t('employerHiringLink')}
                <ArrowRightIcon />
              </LocalizedLink>
            </>
          ) : (
            <>
              <div className="wa-info-card">
                <h3>{t('employerMetricsEmptyTitle')}</h3>
                <p>{t('employerMetricsEmpty')}</p>
              </div>
              <p className="wa-methodology">{t('employerMetricsFootnote')}</p>
              <LocalizedLink href="/employers" className="wa-section-link">
                {t('employerHiringLink')}
                <ArrowRightIcon />
              </LocalizedLink>
            </>
          )}
        </div>
      </section>

      {/* MEMBER STORIES */}
      <section className="wa-iband wa-iband--surface" aria-label={t('testimonialsTitle')}>
        <div className="wa-wrap">
          <div className="wa-sec-head wa-impact-head">
            <h2>{t('testimonialsTitle')}</h2>
            <p>{t('testimonialsSubtitle')}</p>
          </div>
          <TestimonialsCarousel />
        </div>
      </section>

      {/* FUNDERS */}
      <section className="wa-iband wa-iband--dark" aria-label={t('fundersTitle')}>
        <div className="wa-wrap wa-narrow">
          <div className="wa-sec-head wa-impact-head">
            <h2>{t('fundersTitle')}</h2>
          </div>
          <div className="wa-funder-card">
            <span className="wa-eyebrow">{t('nonprofitModelEyebrow')}</span>
            <h3>{t('grantFundedTitle')}</h3>
            <p>{t('grantFundedDesc')}</p>
            <div className="wa-funder-actions">
              <LocalizedLink href="/outcomes" className="wa-btn wa-btn--ghost">
                {t('outcomesLink')}
              </LocalizedLink>
              <LocalizedLink href="/apply" className="wa-btn wa-btn--primary">
                {t('applyCta')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <DynamicFooter />
      <DynamicMobileBottomNav />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
