'use client';

import Link from 'next/link';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import type { VoiceAgentSurfaceProps } from '@/components/portal/VoiceAgentSurface';

type VoiceCoachLauncherCardProps = Omit<VoiceAgentSurfaceProps, 'children'> & {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
};

export default function VoiceCoachLauncherCard({
  title,
  description,
  href,
  ctaLabel,
  ...surface
}: VoiceCoachLauncherCardProps) {
  return (
    <VoiceAgentSurface {...surface} headline={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.86rem',
            lineHeight: 1.55,
            color: 'var(--color-on-surface-variant)',
            flex: 1,
          }}
        >
          {description}
        </p>
        <Link
          href={href}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            width: '100%',
            minHeight: '2.75rem',
            borderRadius: '0.8rem',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            color: '#fff',
            background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))',
            boxShadow: '0 8px 24px rgba(173,44,77,0.2)',
          }}
        >
          {ctaLabel}
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden>
            arrow_forward
          </span>
        </Link>
      </div>
    </VoiceAgentSurface>
  );
}
