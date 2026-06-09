'use client';

import type { ProgramStatus } from '@/lib/content/programs';

interface ProgramStatusBadgeProps {
  status?: ProgramStatus;
  estimatedOpenMonth?: string;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<
  ProgramStatus,
  {
    label: string;
    shortLabel: string;
    bg: string;
    text: string;
    border: string;
    icon: string;
  }
> = {
  open: {
    label: 'Open — Apply Now',
    shortLabel: 'Open',
    bg: 'rgba(34, 139, 34, 0.15)',
    text: '#228b22',
    border: 'rgba(34, 139, 34, 0.35)',
    icon: 'check_circle',
  },
  waitlist: {
    label: 'Waitlist',
    shortLabel: 'Waitlist',
    bg: 'rgba(234, 88, 12, 0.15)',
    text: '#ea580c',
    border: 'rgba(234, 88, 12, 0.35)',
    icon: 'schedule',
  },
  coming_soon: {
    label: 'Coming Soon',
    shortLabel: 'Coming Soon',
    bg: 'rgba(43, 123, 185, 0.15)',
    text: '#2b7bb9',
    border: 'rgba(43, 123, 185, 0.35)',
    icon: 'event',
  },
  closed: {
    label: 'Closed',
    shortLabel: 'Closed',
    bg: 'rgba(107, 114, 128, 0.15)',
    text: '#6b7280',
    border: 'rgba(107, 114, 128, 0.35)',
    icon: 'block',
  },
};

export default function ProgramStatusBadge({
  status = 'open',
  estimatedOpenMonth,
  size = 'sm',
}: ProgramStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const isComingSoon = status === 'coming_soon' && estimatedOpenMonth;

  const sizeStyles = {
    sm: { padding: '0.2rem 0.6rem', fontSize: '0.72rem', iconSize: '0.85rem' },
    md: { padding: '0.3rem 0.75rem', fontSize: '0.8rem', iconSize: '1rem' },
    lg: { padding: '0.5rem 1rem', fontSize: '0.95rem', iconSize: '1.15rem' },
  };

  const s = sizeStyles[size];

  return (
    <span
      role="status"
      aria-label={isComingSoon ? `${config.label} — ${estimatedOpenMonth}` : config.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: s.padding,
        borderRadius: '50px',
        fontSize: s.fontSize,
        fontWeight: 700,
        letterSpacing: '0.02em',
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: s.iconSize, lineHeight: 1 }}
        aria-hidden="true"
      >
        {config.icon}
      </span>
      <span>{isComingSoon ? `${config.shortLabel} — ${estimatedOpenMonth}` : config.label}</span>
    </span>
  );
}
