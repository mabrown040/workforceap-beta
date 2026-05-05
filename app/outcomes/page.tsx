import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { buildPageMetadataAsync } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import { getPublicPlacementOutcomes, wilsonInterval } from '@/lib/outcomes/publicPlacementOutcomes';
import { getProgramBySlug } from '@/lib/content/programs';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.outcomes');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/outcomes',
  });
}

export const revalidate = 3600;

export default async function PublicOutcomesPage() {
  const t = await getTranslations('marketing.outcomes');
  const data = await getPublicPlacementOutcomes(prisma);
  const retentionWilson =
    data.totalPlaced > 0 ? wilsonInterval(data.withRetentionNote, data.totalPlaced) : null;

  const programRows = [...data.byProgram].sort((a, b) => b.count - a.count);
  const fundingRows = [...data.byFunding].filter((r) => r.fundingSource).sort((a, b) => b.count - a.count);
  const retentionRows = [...data.byRetentionStatus].filter((r) => r.retentionStatus).sort((a, b) => b.count - a.count);

  return (
    <div className="inner-page">
      <section className="content-section" style={{ paddingBottom: '1rem' }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <span className="text-label-upper" style={{ color: 'var(--color-accent)', display: 'block', marginBottom: '0.75rem' }}>
            {t('eyebrow')}
          </span>
          <h1 className="text-display-sm" style={{ marginBottom: '1rem' }}>
            {t('heading')}
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
            {t('intro')}{' '}
            <Link href="/programs" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              {t('browsePrograms')}
            </Link>
            .
          </p>
          <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent)' }}>{data.totalPlaced}</p>
            <p style={{ margin: '0.35rem 0 0', fontWeight: 600 }}>{t('placedLabel')}</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>{data.asOfLabel}</p>
            {retentionWilson && data.totalPlaced > 0 ? (
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
                {t('followUpSignal')}{' '}
                <strong style={{ color: 'var(--color-on-surface)' }}>
                  {Math.round((data.withRetentionNote / data.totalPlaced) * 100)}%
                </strong>{' '}
                ({data.withRetentionNote} of {data.totalPlaced}) — {t('wilsonInterval')}{' '}
                {Math.round(retentionWilson.low * 100)}–{Math.round(retentionWilson.high * 100)}% ({t('wilsonScore')}).
              </p>
            ) : null}
          </div>

          {programRows.length > 0 ? (
            <div style={{ marginBottom: '2rem' }}>
              <h2 className="text-display-sm" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
                {t('byProgram')}
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                {programRows.map((row) => {
                  const title = row.programSlug ? getProgramBySlug(row.programSlug)?.title ?? row.programSlug : t('unspecified');
                  return (
                    <li
                      key={row.programSlug ?? 'null'}
                      className="portal-card portal-card--flat"
                      style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}
                    >
                      <span>{title}</span>
                      <strong>{row.count}</strong>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {fundingRows.length > 0 ? (
            <div style={{ marginBottom: '2rem' }}>
              <h2 className="text-display-sm" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
                {t('byFunding')}
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                {fundingRows.map((row) => (
                  <li
                    key={row.fundingSource ?? 'x'}
                    className="portal-card portal-card--flat"
                    style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}
                  >
                    <span>{row.fundingSource}</span>
                    <strong>{row.count}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {retentionRows.length > 0 ? (
            <div style={{ marginBottom: '2rem' }}>
              <h2 className="text-display-sm" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
                {t('byRetention')}
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                {retentionRows.map((row) => (
                  <li
                    key={row.retentionStatus ?? 'x'}
                    className="portal-card portal-card--flat"
                    style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}
                  >
                    <span>{row.retentionStatus}</span>
                    <strong>{row.count}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
