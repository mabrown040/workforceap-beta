'use client';

import { useTour } from './TourContext';
import { MEMBER_PORTAL_TOUR_STEPS } from '@/lib/onboarding/portalTourSteps';

interface StartTourButtonProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: 'primary' | 'outline';
}

export default function StartTourButton({ className, style, variant = 'outline' }: StartTourButtonProps) {
  const { startTour } = useTour();

  const handleClick = () => {
    startTour(MEMBER_PORTAL_TOUR_STEPS, 'member');
  };

  const baseStyles: React.CSSProperties =
    variant === 'primary'
      ? {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.25rem',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          background: 'var(--color-accent)',
          color: '#fff',
        }
      : {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.25rem',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          border: '1px solid var(--surface-container-high)',
          cursor: 'pointer',
          background: 'transparent',
          color: 'var(--color-on-surface)',
        };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={{ ...baseStyles, ...style }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>route</span>
      Take Tour
    </button>
  );
}
