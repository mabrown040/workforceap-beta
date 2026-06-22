/**
 * Partner overview — page-specific kit sections (?ui=kit / default path).
 *
 * These compose existing kit primitives + the .wa-kit-* token CSS to render the
 * mockup sections that have no standalone primitive yet:
 *   - <PartnerKpiGrid>      KPI stat tiles with subtitle/meta lines + accent bars
 *   - <PartnerAttentionCard> "Review member progress" accent CTA card
 *   - <PartnerAssistantAccordion> collapsible Partner-assistant disclosure
 *   - <PartnerQuickActions> 3-up Quick Actions grid (Export / Refer / Milestones)
 *
 * Target mockup: docs/mockups/wa-v2-partner.html
 * No shared kit primitive is modified; StatTile is used as-is (delta = subtitle).
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { StatTile } from '@/components/portal/kit';
import { colorVar, type KitColor } from '@/components/portal/kit/tokens';

// ── KPI grid: StatTile (label/value/subtitle) + bottom accent bar ─────────────

export interface PartnerKpiTile {
  label: string;
  value: string | number;
  /** Subtitle/meta line under the value (rendered via StatTile delta slot). */
  subtitle?: string;
  /** Value + accent-bar color. */
  color?: KitColor;
}

export function PartnerKpiGrid({ items }: { items: PartnerKpiTile[] }) {
  return (
    <div className="wa-grid wa-grid-cols-2 lg:wa-grid-cols-4 wa-gap-3">
      {items.map((it) => (
        <div key={it.label} style={{ position: 'relative' }}>
          <StatTile
            label={it.label}
            value={it.value}
            color={it.color ?? 'text'}
            delta={it.subtitle}
            deltaColor="muted"
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 4,
              borderRadius: '0 0 var(--wa-radius-sm) var(--wa-radius-sm)',
              background: it.color ? colorVar(it.color) : 'var(--wa-border)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Attention / CTA card (accent-soft background) ─────────────────────────────

export function PartnerAttentionCard({
  icon = '💡',
  title,
  body,
  href,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="wa-kit-card wa-kit-card--tinted wa-kit-card--hover wa-kit-focus"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--wa-radius-sm)',
          background: 'var(--wa-accent)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--wa-text)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 2 }}>{body}</div>
      </div>
      <span aria-hidden style={{ fontSize: 18, color: 'var(--wa-accent)', flexShrink: 0 }}>
        →
      </span>
    </Link>
  );
}

// ── Partner-assistant accordion (collapsed by default) ────────────────────────

export function PartnerAssistantAccordion({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <details className="wa-kit-card">
      <summary
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          listStyle: 'none',
          fontWeight: 700,
          fontSize: 13,
          color: 'var(--wa-text)',
        }}
      >
        <span aria-hidden style={{ fontSize: 10, color: 'var(--wa-accent)' }}>
          ▶
        </span>
        <span>{title}</span>
        {hint ? (
          <span style={{ fontSize: 12, color: 'var(--wa-muted)', marginLeft: 'auto', fontWeight: 400 }}>
            {hint}
          </span>
        ) : null}
      </summary>
      {children ? <div style={{ marginTop: 14 }}>{children}</div> : null}
    </details>
  );
}

// ── Quick Actions grid (3-up) ─────────────────────────────────────────────────

export interface PartnerQuickAction {
  icon: ReactNode;
  /** Icon chip tint + glyph color. */
  tone: 'accent' | 'info' | 'gold';
  title: string;
  body: string;
  href: string;
}

const CHIP_BG: Record<PartnerQuickAction['tone'], string> = {
  accent: 'var(--wa-accent-soft)',
  info: 'var(--wa-info-soft)',
  gold: 'var(--wa-gold-soft)',
};
const CHIP_FG: Record<PartnerQuickAction['tone'], string> = {
  accent: 'var(--wa-accent)',
  info: 'var(--wa-info)',
  gold: 'var(--wa-gold)',
};

export function PartnerQuickActions({ actions }: { actions: PartnerQuickAction[] }) {
  return (
    <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-3">
      {actions.map((a) => (
        <Link
          key={a.title}
          href={a.href}
          className="wa-kit-card wa-kit-card--hover wa-kit-focus"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            aria-hidden
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 16,
              background: CHIP_BG[a.tone],
              color: CHIP_FG[a.tone],
            }}
          >
            {a.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--wa-text)' }}>{a.title}</div>
            <div style={{ fontSize: 11, color: 'var(--wa-muted)', marginTop: 2 }}>{a.body}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
