import type { ReactNode } from 'react';

interface PageSectionProps {
  children: ReactNode;
  variant?: 'default' | 'dark' | 'accent' | 'gradient';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  id?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
}

const PADDING_MAP = {
  sm: '2rem clamp(1rem, 4vw, 2rem)',
  md: '3rem clamp(1rem, 4vw, 2rem)',
  lg: '4.5rem clamp(1rem, 4vw, 2rem)',
  xl: '6rem clamp(1rem, 4vw, 2rem)',
};

const BG_MAP = {
  default: undefined,
  dark: 'var(--surface-container)',
  accent: 'var(--color-accent)',
  gradient: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark, #8B1C3A) 100%)',
};

export function PageSection({
  children,
  variant = 'default',
  padding = 'lg',
  className,
  id,
  ariaLabel,
  style,
}: PageSectionProps) {
  const bg = BG_MAP[variant];
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={className}
      style={{
        padding: PADDING_MAP[padding],
        background: bg,
        ...(bg ? { color: variant === 'accent' || variant === 'gradient' ? 'var(--color-white)' : undefined } : {}),
        ...style,
      }}
    >
      <div className="container" style={{ maxWidth: 'var(--max-width, 80rem)', margin: '0 auto' }}>
        {children}
      </div>
    </section>
  );
}
