import type { ReactNode } from 'react';

interface HeroSectionProps {
  eyebrow?: ReactNode;
  headline: ReactNode;
  subheadline?: ReactNode;
  children?: ReactNode;
  backgroundImage?: string;
  minHeight?: string;
  overlayGradient?: string;
  className?: string;
}

export function HeroSection({
  eyebrow,
  headline,
  subheadline,
  children,
  backgroundImage,
  minHeight = '90vh',
  overlayGradient = 'linear-gradient(135deg, rgba(18,20,22,0.94) 0%, rgba(18,20,22,0.78) 50%, rgba(173,44,77,0.2) 100%)',
  className,
}: HeroSectionProps) {
  return (
    <section
      className={className}
      style={{
        position: 'relative',
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {backgroundImage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: overlayGradient,
        }}
      />
      <div
        className="container"
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 'var(--max-width, 80rem)',
          margin: '0 auto',
          padding: '6rem 1.5rem 3rem',
        }}
      >
        {eyebrow && <div style={{ marginBottom: '1.5rem' }}>{eyebrow}</div>}
        {headline && <div style={{ marginBottom: '2rem' }}>{headline}</div>}
        {subheadline && <div style={{ maxWidth: '48rem' }}>{subheadline}</div>}
        {children}
      </div>
    </section>
  );
}
