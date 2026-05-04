import type { PlacementPublicMetrics } from '@/lib/outcomes/placementPublicMetrics';

/**
 * Member-safe trust copy: live counts from PlacementRecord only (no PII).
 */
export default function PlacementTrustCallout({
  metrics,
  variant = 'cards',
}: {
  metrics: PlacementPublicMetrics;
  variant?: 'cards' | 'inline';
}) {
  const n = metrics.placedCount;
  const retention = metrics.withRetentionNote;
  const retentionRate = n > 0 ? Math.round((retention / n) * 100) : null;

  if (variant === 'inline') {
    return (
      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.65 }}>
        In our placement tracker, <strong style={{ color: 'var(--color-on-surface)' }}>{n}</strong> member
        {n === 1 ? '' : 's'} recorded as placed
        {retentionRate != null && n > 0 ? (
          <>
            {' '}
            — with follow-up notes on <strong style={{ color: 'var(--color-on-surface)' }}>{retention}</strong> (
            {retentionRate}%)
          </>
        ) : null}
        . {metrics.asOfLabel}
      </p>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem',
        marginTop: '0.5rem',
      }}
    >
      <div
        className="portal-card portal-card--flat"
        style={{
          padding: '1.1rem',
          borderLeft: '3px solid var(--color-accent)',
          background: 'var(--surface-container)',
        }}
      >
        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1 }}>{n}</div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginTop: '0.35rem' }}>
          Placements on file (n)
        </div>
        <p style={{ margin: '0.45rem 0 0', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.45 }}>
          {metrics.asOfLabel}
        </p>
      </div>
      <div
        className="portal-card portal-card--flat"
        style={{
          padding: '1.1rem',
          borderLeft: '3px solid var(--color-gold)',
          background: 'var(--surface-container)',
        }}
      >
        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-gold)', lineHeight: 1 }}>{retention}</div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginTop: '0.35rem' }}>
          With retention / follow-up note
        </div>
        <p style={{ margin: '0.45rem 0 0', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.45 }}>
          Counselor-recorded outcomes after placement where available.
        </p>
      </div>
    </div>
  );
}
