'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import type { NextBestAction } from '@/lib/member/nextBestActions';

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
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    if (UUID_RE.test(id)) {
      fetch(`/api/member/nba/${id}`, { method: 'PATCH' }).catch(() => {});
    }
  }, []);

  const visible = actions.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

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
          {isFeatured ? 'Recommended next step' : 'Your next steps'}
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
          {isFeatured ? 'Start here based on your progress' : 'Picked for you based on your progress'}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            fillRow && visible.length === 1
              ? '1fr'
              : compact
                ? 'repeat(auto-fill, minmax(240px, 1fr))'
                : 'repeat(auto-fill, minmax(260px, 1fr))',
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
                aria-label={`Dismiss "${a.title}"`}
                onClick={() => dismiss(a.id)}
                style={{
                  position: 'absolute',
                  top: compact ? '0.5rem' : '0.65rem',
                  right: compact ? '0.5rem' : '0.65rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-on-surface-variant)',
                  fontSize: '1rem',
                  lineHeight: 1,
                  padding: '0.15rem',
                  borderRadius: '4px',
                  opacity: 0.6,
                }}
              >
                ✕
              </button>
            )}
            {isFeatured && (
              <span
                style={{
                  alignSelf: 'flex-start',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '9999px',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Start here
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
              }}
            >
              {a.body}
            </p>
            <Link
              href={a.href}
              className="btn btn-primary"
              style={{
                alignSelf: 'flex-start',
                fontSize: compact ? '0.8rem' : isFeatured ? '0.9rem' : '0.85rem',
                padding: compact ? '0.5rem 0.85rem' : isFeatured ? '0.65rem 1.1rem' : '0.55rem 1rem',
                textDecoration: 'none',
                marginTop: '0.25rem',
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
