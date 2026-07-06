import { colorVar, type KitColor } from './tokens';

export interface ChartDatum {
  label: string;
  value: number;
}

interface BarChartMiniProps {
  data: ChartDatum[];
  /** Highlight the last bar (crimson) and mute the rest. */
  highlightLast?: boolean;
  height?: number;
}

/**
 * Dependency-free vertical bar chart. Board outcomes / analytics.
 * Mockup: "Placements by month" in admin board.
 */
export function BarChartMini({ data, highlightLast = false, height = 160 }: BarChartMiniProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height }}>
      {data.map((d, i) => {
        const last = highlightLast && i === data.length - 1;
        const barHeight = d.value > 0 ? `${Math.max((d.value / max) * 100, 4)}%` : 0;
        return (
          <div key={d.label} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <div
                style={{
                  width: '100%',
                  height: barHeight,
                  borderRadius: '8px 8px 0 0',
                  background: last ? 'linear-gradient(to top, var(--wa-accent), var(--wa-accent-bright))' : 'var(--wa-accent)',
                  opacity: last ? 1 : 0.42,
                }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--wa-muted)' }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export interface RankDatum {
  label: string;
  value: string | number;
  pct: number;
  color?: KitColor;
}

/**
 * Horizontal labeled bars (by-program, by-stage breakdowns).
 * Mockup: program health, placements by program.
 */
export function RankBars({ data }: { data: RankDatum[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
            <span style={{ fontWeight: 700 }}>{d.label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--wa-muted)' }}>{d.value}</span>
          </div>
          <div className="wa-kit-bar-track">
            <div className="wa-kit-bar-fill" style={{ width: `${d.pct}%`, background: colorVar(d.color ?? 'accent') }} />
          </div>
        </div>
      ))}
    </div>
  );
}
