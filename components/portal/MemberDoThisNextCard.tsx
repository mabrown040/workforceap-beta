'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { NextBestAction } from '@/lib/member/nextBestActions';
import { trackFunnelEvent } from '@/lib/analytics/events';
import { postMemberEvent } from '@/lib/events/client';

type MemberDoThisNextCardProps = {
  action: NextBestAction | null;
  /** Horizontal padding for section wrapper (default matches desktop dashboard gutter). */
  paddingX?: string;
};

/**
 * Single dominant dashboard CTA — mirrors the top `MemberNextStepsStrip` item with stronger hierarchy.
 */
export default function MemberDoThisNextCard({ action, paddingX = '2rem' }: MemberDoThisNextCardProps) {
  const t = useTranslations('dashboard');
  if (!action) return null;

  return (
    <section style={{ padding: `0 ${paddingX}`, marginBottom: '1.5rem' }} aria-label={t('doThisNext')}>
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
            {t('doThisNext')}
          </p>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {action.title}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.55, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
            {action.body}
          </p>
          <Link
            href={action.href}
            className="btn"
            onClick={() => {
              trackFunnelEvent('member_dashboard', 'dashboard_primary_cta_clicked', {
                action_id: action.id,
                action_label: action.cta,
                href: action.href,
                route: typeof window !== 'undefined' ? window.location.pathname : undefined,
              });
              void postMemberEvent({
                eventName: 'member_dashboard_action_clicked',
                entityType: 'next_best_action',
                sourcePage: '/dashboard',
                metadata: {
                  action: 'dashboard_primary_cta_clicked',
                  action_id: action.id,
                  action_label: action.cta,
                  href: action.href,
                },
              });
            }}
            style={{
              marginTop: '0.25rem',
              alignSelf: 'flex-start',
              background: '#fff',
              color: 'var(--color-accent)',
              fontWeight: 700,
              border: 'none',
              textDecoration: 'none',
              maxWidth: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {action.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
