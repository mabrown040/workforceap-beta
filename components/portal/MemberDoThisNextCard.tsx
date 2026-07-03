'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';

import type { NextBestAction } from '@/lib/member/nextBestActions';
import { trackFunnelEvent } from '@/lib/analytics/events';
import { postMemberEvent } from '@/lib/events/client';

type MemberDoThisNextCardProps = {
  action: NextBestAction | null;
  /** Horizontal padding for section wrapper (default matches desktop dashboard gutter). Ignored by `variant="kit"`, which is placed inside an already-padded container. */
  paddingX?: string;
  /**
   * 'legacy' (default) renders the original `--color-*` CSS-var styling used
   * by the `?ui=legacy` dashboard (DashboardHomeClient / mobile). 'kit'
   * renders with the portal design kit's `--wa-*` tokens and `wa-kit-*`
   * classes so the card sits natively inside MemberHomeKit instead of
   * looking pasted from the legacy dashboard.
   */
  variant?: 'legacy' | 'kit';
};

/**
 * Single dominant dashboard CTA — mirrors the top `MemberNextStepsStrip` item with stronger hierarchy.
 */
export default function MemberDoThisNextCard({ action, paddingX = '2rem', variant = 'legacy' }: MemberDoThisNextCardProps) {
  const t = useTranslations('dashboard');
  if (!action) return null;

  const handleCtaClick = () => {
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
  };

  if (variant === 'kit') {
    return (
      <section aria-label={t('doThisNext')}>
        <div
          className="wa-kit-card wa-kit-card--gradient-crimson"
          style={{ display: 'flex', flexDirection: 'column', gap: 10, boxShadow: 'var(--wa-shadow-lg)' }}
        >
          <div
            className="wa-flex wa-items-center wa-gap-2"
            style={{ color: 'color-mix(in srgb, var(--wa-on-accent) 85%, transparent)' }}
          >
            <Sparkles size={13} aria-hidden />
            <span className="wa-text-xs wa-font-bold wa-uppercase" style={{ letterSpacing: '0.14em' }}>
              {t('doThisNext')}
            </span>
          </div>
          <h2
            className="h-font"
            style={{
              fontSize: 'clamp(1.05rem, 3.2vw, 1.375rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--wa-on-accent)',
              margin: 0,
              lineHeight: 1.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {action.title}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: 'color-mix(in srgb, var(--wa-on-accent) 90%, transparent)',
              margin: 0,
              lineHeight: 1.55,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {action.body}
          </p>
          <Link
            href={action.href}
            onClick={handleCtaClick}
            className="wa-kit-focus"
            style={{
              marginTop: 4,
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              minHeight: 44,
              background: 'var(--wa-on-accent)',
              color: 'var(--wa-accent)',
              fontWeight: 700,
              fontSize: 12,
              borderRadius: 999,
              textDecoration: 'none',
              maxWidth: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {action.cta} <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
      </section>
    );
  }

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
            onClick={handleCtaClick}
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
