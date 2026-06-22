import type { ReactNode } from 'react';
import { FileSpreadsheet, FileText, Users, SlidersHorizontal, Download } from 'lucide-react';
import {
  DesignSurface,
  SectionHeader,
  StatusTag,
  colorVar,
} from '@/components/portal/kit';

/**
 * Exports — board / funder / compliance data downloads as a responsive card grid.
 * Mockup: workforceap-admin-full.html "exports" view.
 * Target route: /admin/exports
 *
 * Each card is a file-icon tile + title + description, linking to a REAL export
 * route the page already exposes (CSV download endpoints) or, for the filterable
 * Member Training Report, into the legacy form view. Server-rendered (plain
 * anchors, no interactivity) so it stays a clean RSC.
 */

export type ExportTone = 'success' | 'info' | 'accent' | 'gold' | 'muted';

export interface ExportOption {
  id: string;
  /** Card title, e.g. "Funder program summary". */
  title: string;
  /** One-line description / context, e.g. "Grant reporting · per-program". */
  description: string;
  /** Real route the card links to (API download endpoint or legacy view). */
  href: string;
  /** Which file icon to show. */
  icon?: 'csv' | 'xlsx' | 'roster' | 'filters' | 'download';
  /** Tile tint. */
  tone?: ExportTone;
  /** Optional short status pill (e.g. "PII gated"). */
  badge?: string;
  badgeTone?: 'ok' | 'warn' | 'alert' | 'info' | 'muted';
  /** Trigger a browser download rather than a navigation. */
  download?: boolean;
  /** Open in a new tab (for export endpoints that stream a file). */
  newTab?: boolean;
}

export interface ExportsKitProps {
  exports?: ExportOption[];
}

const DEFAULT_EXPORTS: ExportOption[] = [
  {
    id: 'placement-outcomes',
    title: 'Placement outcomes (CSV)',
    description: 'Board-ready · YTD',
    href: '/admin/exports?ui=legacy',
    icon: 'csv',
    tone: 'success',
  },
  {
    id: 'wioa-compliance',
    title: 'WIOA compliance (XLSX)',
    description: 'Funder report · this quarter',
    href: '/admin/exports?ui=legacy',
    icon: 'xlsx',
    tone: 'muted',
  },
  {
    id: 'member-roster',
    title: 'Full member roster',
    description: '847 records · PII gated',
    href: '/admin/exports?ui=legacy',
    icon: 'roster',
    tone: 'info',
    badge: 'PII gated',
    badgeTone: 'warn',
  },
];

const TONE_TINT: Record<ExportTone, { bg: string; fg: string }> = {
  success: { bg: 'rgba(74,155,79,0.12)', fg: colorVar('success') },
  info: { bg: 'rgba(43,123,185,0.12)', fg: colorVar('info') },
  accent: { bg: 'rgba(173,44,77,0.10)', fg: colorVar('accent') },
  gold: { bg: 'rgba(164,127,56,0.14)', fg: colorVar('gold') },
  muted: { bg: 'var(--wa-surface-2, #f4f4f5)', fg: 'var(--wa-text)' },
};

function exportIcon(kind: ExportOption['icon']): ReactNode {
  switch (kind) {
    case 'csv':
      return <FileSpreadsheet className="h-5 w-5" />;
    case 'xlsx':
      return <FileSpreadsheet className="h-5 w-5" />;
    case 'roster':
      return <Users className="h-5 w-5" />;
    case 'filters':
      return <SlidersHorizontal className="h-5 w-5" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
}

function ExportTile({ option }: { option: ExportOption }) {
  const tint = TONE_TINT[option.tone ?? 'muted'];
  return (
    <a
      href={option.href}
      {...(option.download ? { download: true } : {})}
      {...(option.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="wa-kit-card wa-kit-card--hover wa-kit-focus"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: tint.bg,
            color: tint.fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {exportIcon(option.icon)}
        </div>
        {option.badge ? <StatusTag tone={option.badgeTone ?? 'muted'}>{option.badge}</StatusTag> : null}
      </div>

      <div style={{ minWidth: 0 }}>
        <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', margin: 0 }}>{option.title}</h3>
        <p style={{ fontSize: 12, color: 'var(--wa-muted)', margin: '2px 0 0' }}>{option.description}</p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          color: colorVar('accent'),
          paddingTop: 12,
          borderTop: '1px solid var(--wa-border)',
        }}
      >
        <Download className="h-3.5 w-3.5" />
        {option.href.includes('ui=legacy') ? 'Open' : 'Download'}
      </div>
    </a>
  );
}

export function ExportsKit({ exports = DEFAULT_EXPORTS }: ExportsKitProps) {
  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Exports"
        kicker="Reporting"
        goal="Download data for board, funders & compliance"
      />

      {exports.length > 0 ? (
        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-2 lg:wa-grid-cols-3 wa-gap-4">
          {exports.map((option) => (
            <ExportTile key={option.id} option={option} />
          ))}
        </div>
      ) : (
        <div
          className="wa-kit-card"
          style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--wa-muted)' }}
        >
          <Download className="h-6 w-6" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <p style={{ fontWeight: 700, color: 'var(--wa-text)', margin: 0 }}>No exports available</p>
          <p style={{ fontSize: 12, margin: '4px 0 0' }}>
            Export options will appear here once reporting is configured.
          </p>
        </div>
      )}
    </DesignSurface>
  );
}
