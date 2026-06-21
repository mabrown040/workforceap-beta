import type { ReactNode } from 'react';

interface FeatureTileProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  badge?: string;
  /** Gradient in warm mode, auto-falls-back to tint in dense (token CSS). */
  tone?: 'crimson' | 'gold';
  href?: string;
  onClick?: () => void;
}

/**
 * Bold/Calm feature tile. Gradient when surface pop is on (warm/member), calm
 * tint when off (dense) — handled by .wa-kit-card--gradient-* token CSS.
 * Mockup: member home Career Toolkit / Next Badge.
 */
export function FeatureTile({ icon, title, body, badge, tone = 'crimson', href, onClick }: FeatureTileProps) {
  const Tag = href ? 'a' : 'button';
  return (
    <Tag
      href={href}
      onClick={onClick}
      className={`wa-kit-card wa-kit-card--gradient-${tone} wa-kit-card--hover wa-kit-focus`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 170,
        textAlign: 'left',
        cursor: 'pointer',
        border: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {icon ? <div style={{ fontSize: 22, lineHeight: 1 }}>{icon}</div> : <span />}
        {badge ? (
          <span style={{ padding: '2px 9px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', background: 'rgba(255,255,255,0.2)', borderRadius: 999 }}>
            {badge}
          </span>
        ) : null}
      </div>
      <div>
        <h3 style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>{title}</h3>
        {body ? <p style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{body}</p> : null}
      </div>
    </Tag>
  );
}
