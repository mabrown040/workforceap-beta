import Link from 'next/link';
import type { NextBestAction } from '@/lib/member/nextBestActions';

export default function MemberNextStepsStrip({
  actions,
  compact = false,
  fillRow = false,
}: {
  actions: NextBestAction[];
  compact?: boolean;
  /** When one card: stretch to full width so the grid does not look half-empty */
  fillRow?: boolean;
}) {
  if (actions.length === 0) return null;

  return (
    <section
      style={{
        marginBottom: compact ? '1rem' : '2rem',
        padding: compact ? '0' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: compact ? '0.65rem' : '1rem',
          flexWrap: 'wrap',
        }}
      >
        <h3
          style={{
            fontSize: compact ? '0.7rem' : '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-on-surface-variant)',
            margin: 0,
          }}
        >
          Your next steps
        </h3>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', opacity: 0.85 }}>
          Picked for you based on your progress
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            fillRow && actions.length === 1
              ? '1fr'
              : compact
                ? 'repeat(auto-fill, minmax(240px, 1fr))'
                : 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: compact ? '0.65rem' : '1rem',
        }}
      >
        {actions.map((a) => (
          <div
            key={a.id}
            className="stitch-card"
            style={{
              padding: compact ? '0.85rem' : '1rem',
              borderLeft:
                a.variant === 'urgent' ? '4px solid var(--color-accent)' : '1px solid var(--outline-variant)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              minHeight: compact ? 'auto' : undefined,
            }}
          >
            <h4
              style={{
                fontWeight: 700,
                fontSize: compact ? '0.9rem' : '0.95rem',
                margin: 0,
                color: 'var(--color-on-surface)',
                lineHeight: 1.3,
              }}
            >
              {a.title}
            </h4>
            <p
              style={{
                fontSize: compact ? '0.78rem' : '0.82rem',
                color: 'var(--color-on-surface-variant)',
                lineHeight: 1.5,
                margin: 0,
                flex: 1,
              }}
            >
              {a.body}
            </p>
            <Link
              href={a.href}
              className="btn btn-primary"
              style={{
                alignSelf: 'flex-start',
                fontSize: compact ? '0.75rem' : '0.8rem',
                padding: compact ? '0.4rem 0.85rem' : '0.45rem 1rem',
                textDecoration: 'none',
                marginTop: '0.25rem',
              }}
            >
              {a.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
