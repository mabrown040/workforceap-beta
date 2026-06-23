import {
  DesignSurface,
  KpiStrip,
  SectionHeader,
  RankBars,
  type KpiItem,
  type RankDatum,
} from '@/components/portal/kit';

/**
 * Analytics — engagement & funnel analytics workspace.
 * Mockup: workforceap-admin-full.html "analytics" view.
 * Target route: /admin/analytics
 *
 * Pure read view — no interactivity, so no 'use client'.
 *
 * Composition mirrors BoardOutcomesKit: SectionHeader + KpiStrip + a
 * responsive grid of RankBars panels. The page supplies real lean data;
 * the defaults here keep Storybook/standalone renders sensible and give
 * a graceful empty state when a series is omitted.
 */
export interface AnalyticsKitProps {
  /** Headline KPI tiles: WAU / Avg Session / AI Tool Uses / Voice Sessions. */
  kpis?: KpiItem[];
  /** "Most-used tools (last 30 days)" ranked bars. */
  topTools?: RankDatum[];
  /** "Weekly active by program" ranked bars. */
  activeByProgram?: RankDatum[];
  /** Page header title. */
  title?: string;
  /** Page goal/subtitle caption under the title. */
  goal?: string;
  /** Small uppercase eyebrow above the title. */
  kicker?: string;
}

const DEFAULT_KPIS: KpiItem[] = [
  { label: 'WAU', value: 0, color: 'info' },
  { label: 'Avg Session', value: '—' },
  { label: 'AI Tool Uses', value: 0, color: 'accent' },
  { label: 'Voice Sessions', value: 0, color: 'gold' },
];

const EMPTY_HINT = (
  <p style={{ fontSize: 12, color: 'var(--wa-muted)', margin: 0 }}>No data for this period yet.</p>
);

export function AnalyticsKit({
  kpis = DEFAULT_KPIS,
  topTools,
  activeByProgram,
  title = 'Analytics',
  goal = 'Engagement & funnel analytics',
  kicker,
}: AnalyticsKitProps) {
  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader title={title} kicker={kicker} goal={goal} />

      <KpiStrip cols={4} items={kpis} />

      <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-2 wa-gap-5 wa-mt-6">
        {/* Most-used tools (last 30 days). `minWidth: 0` lets this grid column
            shrink to the viewport on phones; RankBars are %-width so they stay
            within the column at any width. */}
        <div className="wa-kit-card" style={{ minWidth: 0 }}>
          <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', marginBottom: 2 }}>
            Most-used tools
          </h3>
          <p style={{ fontSize: 11, color: 'var(--wa-muted)', marginTop: 0, marginBottom: 16 }}>
            last 30 days
          </p>
          {topTools && topTools.length > 0 ? <RankBars data={topTools} /> : EMPTY_HINT}
        </div>

        {/* Weekly active by program. */}
        <div className="wa-kit-card" style={{ minWidth: 0 }}>
          <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', marginBottom: 16 }}>
            Weekly active by program
          </h3>
          {activeByProgram && activeByProgram.length > 0 ? (
            <RankBars data={activeByProgram} />
          ) : (
            EMPTY_HINT
          )}
        </div>
      </div>
    </DesignSurface>
  );
}
