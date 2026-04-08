'use client';

import Link from 'next/link';
import { trackToolLaunch } from '@/lib/analytics/events';

type AIToolCardProps = {
  id: string;
  title: string;
  description: string;
  timeToComplete: string;
  status: 'coming_soon' | 'available';
  href?: string;
  icon?: string;
  badge?: string;
  accentBorder?: boolean;
  rowSpan2?: boolean;
  exampleText?: string;
};

export default function AIToolCard({
  id,
  title,
  description,
  timeToComplete,
  status,
  href = '/dashboard/ai-tools',
  icon = 'build',
  badge,
  accentBorder = false,
  rowSpan2 = false,
  exampleText,
}: AIToolCardProps) {
  const isAvailable = status === 'available';

  const handleClick = () => {
    if (isAvailable) {
      trackToolLaunch(id, title);
    }
  };

  const cta = isAvailable ? (
    <Link
      href={href}
      className="ai-tool-cta"
      onClick={handleClick}
      aria-label={`Launch tool: ${title}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1.25rem',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--color-accent)',
        border: '1px solid var(--color-accent)',
        borderRadius: '8px',
        background: 'transparent',
        transition: 'all 0.2s ease',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-accent)';
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--color-accent)';
      }}
    >
      Launch tool
      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">arrow_forward</span>
    </Link>
  ) : (
    <span
      className="ai-tool-cta"
      aria-disabled="true"
      style={{
        display: 'inline-block',
        padding: '0.5rem 1.25rem',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--color-on-surface-variant)',
        border: '1px solid var(--surface-container-highest)',
        borderRadius: '8px',
        opacity: 0.6,
        cursor: 'not-allowed',
      }}
    >
      Coming soon
    </span>
  );

  return (
    <div
      className="stitch-card"
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        borderTop: accentBorder ? '2px solid var(--color-accent)' : undefined,
        gridRow: rowSpan2 ? 'span 2' : undefined,
        position: 'relative',
      }}
    >
      {/* Icon + Time badge row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--surface-container-highest)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: 'var(--color-accent)' }} aria-hidden="true">
            {icon}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {badge && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                background: 'rgba(173,44,77,0.15)',
                color: 'var(--color-accent)',
              }}
            >
              {badge}
            </span>
          )}
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--color-on-surface-variant)',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              background: 'var(--surface-container-highest)',
            }}
          >
            {timeToComplete}
          </span>
        </div>
      </div>

      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--color-on-surface)' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, margin: 0, flex: 1 }}>
        {description}
      </p>

      {exampleText && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            background: 'var(--surface-container-highest)',
            fontSize: '0.8rem',
            color: 'var(--color-on-surface-variant)',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          {exampleText}
        </div>
      )}

      {cta}
    </div>
  );
}
