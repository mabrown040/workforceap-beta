import type { CSSProperties } from 'react';

type Variant = 'success' | 'accent' | 'blue' | 'gold' | 'neutral';

const variantStyles: Record<Variant, { bg: string; color: string }> = {
  success: { bg: 'color-mix(in srgb, var(--color-green) 12%, transparent)', color: 'var(--color-green)' },
  accent: { bg: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', color: 'var(--color-accent)' },
  blue: { bg: 'color-mix(in srgb, var(--color-blue) 12%, transparent)', color: 'var(--color-blue)' },
  gold: { bg: 'color-mix(in srgb, var(--color-gold) 14%, transparent)', color: 'var(--color-gold)' },
  neutral: { bg: 'var(--surface-container-highest)', color: 'var(--color-on-surface-variant)' },
};

export default function StatusBadge({
  label,
  variant = 'neutral',
  className = '',
}: {
  label: string;
  variant?: string;
  className?: string;
}) {
  const safeVariant = (variant in variantStyles ? variant : 'neutral') as Variant;
  const style = variantStyles[safeVariant];

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.625rem',
        borderRadius: '9999px',
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        background: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
