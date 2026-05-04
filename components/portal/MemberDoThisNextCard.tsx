import Link from 'next/link';

import type { NextBestAction } from '@/lib/member/nextBestActions';

type MemberDoThisNextCardProps = {
  action: NextBestAction | null;
  /** Horizontal padding for section wrapper (default matches desktop dashboard gutter). */
  paddingX?: string;
};

/**
 * Single dominant dashboard CTA — mirrors the top `MemberNextStepsStrip` item with stronger hierarchy.
 */
export default function MemberDoThisNextCard({ action, paddingX = '2rem' }: MemberDoThisNextCardProps) {
  if (!action) return null;

  return (
    <section style={{ padding: `0 ${paddingX}`, marginBottom: '1.5rem' }} aria-label="Do this next">
      <div
        style={{
          borderRadius: '1rem',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))',
          boxShadow: '0 10px 32px color-mix(in srgb, var(--color-accent) 26%, transparent)',
        }}
      >
        <div style={{ padding: '1.35rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <p
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: 'rgba(255,255,255,0.82)',
              margin: 0,
            }}
          >
            Do this next
          </p>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.25 }}>
            {action.title}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.55 }}>
            {action.body}
          </p>
          <Link
            href={action.href}
            className="btn"
            style={{
              marginTop: '0.25rem',
              alignSelf: 'flex-start',
              background: '#fff',
              color: 'var(--color-accent)',
              fontWeight: 700,
              border: 'none',
              textDecoration: 'none',
            }}
          >
            {action.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
