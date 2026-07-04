'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { NextBestAction } from '@/lib/member/nextBestActions';
import { postMemberEvent } from '@/lib/events/client';
import { trackFunnelEvent } from '@/lib/analytics/events';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function MemberNextStepsStrip({
  actions,
  compact = false,
  fillRow = false,
}: {
  actions: NextBestAction[];
  compact?: boolean;
  /** When one card: stretch to full width so the grid does not look half-empty */
  fillRow?: boolean;
}) {
  const t = useTranslations('dashboard');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const router = useRouter();

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    if (UUID_RE.test(id)) {
      fetch(`/api/member/nba/${id}`, { method: 'PATCH' }).catch(() => {});
    }
  }, []);

  const trackClick = useCallback((id: string, href: string, label: string) => {
    void postMemberEvent({
      eventName: 'member_dashboard_action_clicked',
      entityType: 'next_best_action',
      entityId: UUID_RE.test(id) ? id : undefined,
      metadata: { action_id: id, href },
      sourcePage: '/dashboard',
    });
    trackFunnelEvent('member_dashboard', 'primary_cta_clicked', {
      action_id: id,
      action_label: label,
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
  }, []);

  const completeAndOpen = useCallback(async (id: string, href: string, label: string) => {
    trackClick(id, href, label);
    if (!UUID_RE.test(id)) {
      router.push(href);
      return;
    }

    setDismissed((prev) => new Set([...prev, id]));
    try {
      await fetch(`/api/member/nba/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
        keepalive: true,
      });
    } catch {
      // Navigate anyway — tracking should never block the member.
    }
    router.push(href);
  }, [router, trackClick]);

  const visible = actions.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  // Product stake: when there is one clear next step, emphasize it so the dashboard feels
  // guided and calm instead of making members hunt through a menu.
  const isFeatured = fillRow && visible.length === 1 && !compact;

  return (
    <section
      style={{
        marginBottom: compact ? '1rem' : '2rem',
        padding: compact ? '0' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: compact ? '0.65rem' : '1rem',
          flexWrap: 'wrap',
        }}
      >
        <h3
          style={{
            fontSize: compact ? '0.75rem' : '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-on-surface-variant)',
            margin: 0,
          }}
        >
          {isFeatured ? t('recommendedNextStep') : t('yourNextStepsTitle')}
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
          {isFeatured ? t('startHereBasedOnProgress') : t('pickedForYou')}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            fillRow && visible.length === 1
              ? '1fr'
              : compact
                ? 'repeat(auto-fill, minmax(200px, 1fr))'
                : 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: compact ? '0.65rem' : '1rem',
        }}
      >
        {visible.map((a) => (
          <div
            key={a.id}
            className="portal-card portal-card--flat"
            style={{
              padding: compact ? '0.85rem' : isFeatured ? '1.25rem' : '1rem',
              borderLeft:
                a.variant === 'urgent' || isFeatured ? '4px solid var(--color-accent)' : '1px solid var(--outline-variant)',
              background: isFeatured ? 'color-mix(in srgb, var(--color-accent) 7%, var(--surface-container-low))' : undefined,
              display: 'flex',
              flexDirection: 'column',
              gap: isFeatured ? '0.65rem' : '0.5rem',
              minHeight: compact ? 'auto' : undefined,
              position: 'relative',
              boxShadow: isFeatured ? '0 10px 30px -18px rgba(140,15,55,0.35)' : undefined,
            }}
          >
            {!isFeatured && (
              <button
                type="button"
                aria-label={t('dismissAction', { title: a.title })}
                onClick={() => dismiss(a.id)}
                style={{
                  position: 'absolute',
                  top: compact ? '0.25rem' : '0.35rem',
                  right: compact ? '0.25rem' : '0.35rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-on-surface-variant)',
                  fontSize: '1rem',
                  lineHeight: 1,
                  padding: '0.75rem',
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  opacity: 0.6,
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1rem' }}>
                  close
                </span>
              </button>
            )}
            {isFeatured && (
              <span
                style={{
                  alignSelf: 'flex-start',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '9999px',
                  background: 'var(--color-accent)',
                  color: 'var(--color-on-accent)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {t('startHere')}
              </span>
            )}
            <h4
              style={{
                fontWeight: 700,
                fontSize: compact ? '0.9rem' : isFeatured ? '1.1rem' : '0.95rem',
                margin: 0,
                color: 'var(--color-on-surface)',
                lineHeight: 1.3,
                paddingRight: isFeatured ? '0' : '1.5rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {a.title}
            </h4>
            <p
              style={{
                fontSize: compact ? '0.8125rem' : isFeatured ? '0.95rem' : '0.875rem',
                color: 'var(--color-on-surface-variant)',
                lineHeight: 1.5,
                margin: 0,
                flex: 1,
                maxWidth: isFeatured ? '42rem' : undefined,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {a.body}
            </p>
            <Link
              href={a.href}
              className="btn btn-primary"
              onClick={(e) => {
                if (!UUID_RE.test(a.id)) {
                  trackClick(a.id, a.href, a.cta);
                  return;
                }
                e.preventDefault();
                void completeAndOpen(a.id, a.href, a.cta);
              }}
              style={{
                alignSelf: 'flex-start',
                fontSize: compact ? '0.8rem' : isFeatured ? '0.9rem' : '0.85rem',
                padding: compact ? '0.5rem 0.85rem' : isFeatured ? '0.65rem 1.1rem' : '0.55rem 1rem',
                textDecoration: 'none',
                marginTop: '0.25rem',
                maxWidth: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {a.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
