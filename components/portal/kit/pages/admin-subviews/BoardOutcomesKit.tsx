import { FileSpreadsheet, Users, ArrowRight } from 'lucide-react';
import {
  DesignSurface,
  KpiStrip,
  SectionHeader,
  BarChartMini,
  RankBars,
  type KpiItem,
  type ChartDatum,
  type RankDatum,
} from '@/components/portal/kit';

/**
 * Board Outcomes — the board-ready outcomes & metrics workspace (dense).
 * Mockup: workforceap-admin-suite.html "Outcomes & Metrics" view.
 * Target route: /admin/outcomes
 *
 * Pure read view — no interactivity, so no 'use client'.
 */
export interface FunderExport {
  /** Stable key + label, e.g. "Outcomes CSV". */
  label: string;
  /** Short description of what the export contains. */
  description: string;
  /** Where the export download is triggered (wire to a real endpoint later). */
  href: string;
}

export interface BoardOutcomesKitProps {
  /** Headline KPI tiles. Defaults from the mockup. */
  kpis?: KpiItem[];
  /** "Placements by month" bar chart data. */
  placementsByMonth?: ChartDatum[];
  /** Total placements caption for the chart subtitle. */
  placementsTotal?: number;
  /** Reporting period label (chart subtitle + page caption). */
  periodLabel?: string;
  /** "By program" ranked bars. */
  byProgram?: RankDatum[];
  /** "Funder exports" list. */
  exports?: FunderExport[];
}

const DEFAULT_KPIS: KpiItem[] = [
  { label: 'Placement Rate', value: '68%', color: 'success' },
  { label: 'Avg Starting Wage', value: '$58k', color: 'text' },
  { label: 'Credentials Earned', value: 541, color: 'gold' },
  { label: '90-Day Retention', value: '84%', color: 'info' },
];

const DEFAULT_PLACEMENTS_BY_MONTH: ChartDatum[] = [
  { label: 'Jan', value: 38 },
  { label: 'Feb', value: 46 },
  { label: 'Mar', value: 55 },
  { label: 'Apr', value: 62 },
  { label: 'May', value: 78 },
  { label: 'Jun', value: 90 },
];

const DEFAULT_BY_PROGRAM: RankDatum[] = [
  { label: 'Cloud & IT', value: 82, pct: 100, color: 'info' },
  { label: 'Healthcare', value: 61, pct: 74, color: 'info' },
  { label: 'Data & AI', value: 38, pct: 46, color: 'info' },
  { label: 'Manufacturing', value: 22, pct: 27, color: 'info' },
  { label: 'Skilled Trades', value: 10, pct: 12, color: 'info' },
];

const DEFAULT_EXPORTS: FunderExport[] = [
  {
    label: 'Outcomes CSV',
    description: 'Placements, wages & retention by cohort — board-ready.',
    href: '#',
  },
  {
    label: 'Demographics report',
    description: 'Enrollment & outcomes broken out by demographic.',
    href: '#',
  },
];

export function BoardOutcomesKit({
  kpis = DEFAULT_KPIS,
  placementsByMonth = DEFAULT_PLACEMENTS_BY_MONTH,
  placementsTotal = 213,
  periodLabel = '2026 YTD',
  byProgram = DEFAULT_BY_PROGRAM,
  exports = DEFAULT_EXPORTS,
}: BoardOutcomesKitProps) {
  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Board Outcomes"
        kicker="Outcomes & Metrics"
        goal="Board-ready — everything in one place."
      />

      <KpiStrip cols={4} items={kpis} />

      <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-3 wa-gap-5 wa-mt-6">
        {/* Placements by month. `minWidth: 0` lets this grid column shrink to
            the viewport on phones — grid items default to `min-width: auto`,
            which can otherwise let the flex bar row force horizontal overflow.
            The chart itself is fluid (flex:1 bars + height only), so it stays
            in width and desktop is unchanged. */}
        <div className="wa-kit-card lg:wa-col-span-2" style={{ minWidth: 0 }}>
          <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>
            Placements by month
          </h3>
          <p style={{ fontSize: 11, color: 'var(--wa-muted)', marginTop: 2, marginBottom: 20 }}>
            {periodLabel} · {placementsTotal} total
          </p>
          <BarChartMini data={placementsByMonth} highlightLast height={176} />
        </div>

        {/* By program — same `minWidth: 0` guard; RankBars are %-width, so
            they stay within the column at any phone width. */}
        <div className="wa-kit-card" style={{ minWidth: 0 }}>
          <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', marginBottom: 16 }}>
            By program
          </h3>
          <RankBars data={byProgram} />
        </div>
      </div>

      {/* Funder exports */}
      <div className="wa-kit-card wa-mt-6">
        <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Funder exports
        </h3>
        <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginBottom: 16 }}>
          Download the files funders and the board ask for.
        </p>
        <div className="wa-space-y-2">
          {exports.map((exp) => (
            <a
              key={exp.label}
              href={exp.href}
              className="wa-kit-card wa-kit-card--sm wa-kit-card--hover wa-kit-focus"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'var(--wa-accent-soft)',
                  color: 'var(--wa-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {exp.label === 'Demographics report' ? (
                  <Users size={18} />
                ) : (
                  <FileSpreadsheet size={18} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{exp.label}</div>
                <div style={{ fontSize: 11, color: 'var(--wa-muted)' }}>{exp.description}</div>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--wa-muted)', flexShrink: 0 }} />
            </a>
          ))}
        </div>
      </div>
    </DesignSurface>
  );
}
