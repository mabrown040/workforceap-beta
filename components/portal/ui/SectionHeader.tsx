import type { ReactNode } from 'react';

/**
 * Section header — title + optional subtitle + optional right-aligned action.
 *
 * Replaces the repeated pattern:
 *
 *   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
 *     <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{title}</h2>
 *     <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{subtitle}</p>
 *     <button>{action}</button>
 *   </div>
 *
 * Centralizes the spacing, font sizing, and wrap behavior so a future tweak
 * (e.g. denser admin layouts) lives in one place.
 *
 * For full card headers (with full-bleed body underneath) prefer `<PortalCard
 * title="..." action={...}>`. Use this when the heading sits inside an
 * already-styled section/card and you just want consistent typography.
 */

export type SectionHeaderProps = {
  title: ReactNode;
  /** Right-side content: typically a count, status, link, or button. */
  action?: ReactNode;
  /** Subtitle below the title. */
  subtitle?: ReactNode;
  /** Heading level for accessibility. Default 2. */
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  /** Tighter typography for nested sections. Default 'standard'. */
  density?: 'standard' | 'compact';
  className?: string;
};

const FONT_BY_DENSITY: Record<NonNullable<SectionHeaderProps['density']>, string> = {
  standard: '1.05rem',
  compact: '0.95rem',
};

export default function SectionHeader({
  title,
  action,
  subtitle,
  as: Tag = 'h2',
  density = 'standard',
  className,
}: SectionHeaderProps) {
  const fontSize = FONT_BY_DENSITY[density];

  return (
    <header
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: subtitle ? 'flex-start' : 'baseline',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginBottom: '0.5rem',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Tag style={{ margin: 0, fontSize }}>{title}</Tag>
        {subtitle ? (
          <p
            style={{
              margin: '0.2rem 0 0',
              fontSize: '0.85rem',
              color: 'var(--color-on-surface-variant)',
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </header>
  );
}
