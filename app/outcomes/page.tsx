import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { buildPageMetadata } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import { getPublicPlacementOutcomes, wilsonInterval } from '@/lib/outcomes/publicPlacementOutcomes';
import { getProgramBySlug } from '@/lib/content/programs';

export const metadata: Metadata = buildPageMetadata({
  title: 'Outcomes snapshot',
  description:
    'Aggregate placement counts from WorkforceAP internal records — no guaranteed outcomes; funded access for qualifying members.',
  path: '/outcomes',
});

export const revalidate = 3600;

export default async function PublicOutcomesPage() {
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
            Transparency
          </span>
          <h1 className="text-display-sm" style={{ marginBottom: '1rem' }}>
            Placement outcomes (aggregate)
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
            These counts come from internal placement records — not a promise of future results. Programs may be available at no upfront cost for qualifying members through WorkforceAP and partner-backed pathways.{' '}
            <Link href="/programs" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              Browse programs
            </Link>
            .
          </p>
          <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent)' }}>{data.totalPlaced}</p>
            <p style={{ margin: '0.35rem 0 0', fontWeight: 600 }}>Members with a placement on file</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>{data.asOfLabel}</p>
            {retentionWilson && data.totalPlaced > 0 ? (
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
                Follow-up signal rate:{' '}
                <strong style={{ color: 'var(--color-on-surface)' }}>
                  {Math.round((data.withRetentionNote / data.totalPlaced) * 100)}%
                </strong>{' '}
                ({data.withRetentionNote} of {data.totalPlaced}) — approximate 95% interval{' '}
                {Math.round(retentionWilson.low * 100)}–{Math.round(retentionWilson.high * 100)}% (Wilson score).
              </p>
            ) : null}
          </div>

          {programRows.length > 0 ? (
            <div style={{ marginBottom: '2rem' }}>
              <h2 className="text-display-sm" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
                By program (where recorded)
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                {programRows.map((row) => {
                  const title = row.programSlug ? getProgramBySlug(row.programSlug)?.title ?? row.programSlug : 'Unspecified';
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
                By funding source (where recorded)
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
                Retention status (where recorded)
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
