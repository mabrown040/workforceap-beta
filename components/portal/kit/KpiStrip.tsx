import { StatTile } from './StatTile';
import type { KitColor } from './tokens';

export interface KpiItem {
  label: string;
  value: string | number;
  delta?: string;
  color?: KitColor;
  deltaColor?: KitColor;
}

interface KpiStripProps {
  items: KpiItem[];
  /** Desktop column count (mobile is always 2). Default 4. */
  cols?: 4 | 5 | 6;
}

const COLS: Record<number, string> = {
  4: 'lg:wa-grid-cols-4',
  5: 'lg:wa-grid-cols-5',
  6: 'lg:wa-grid-cols-6',
};

/**
 * Responsive KPI row: 2-col on mobile → N-col on desktop. The dense data
 * cockpit and the member/admin homes all open with one of these.
 * Mockup: every "kpis(...)" strip in the concept + admin mockups.
 */
export function KpiStrip({ items, cols = 4 }: KpiStripProps) {
  return (
    <div className={`wa-grid wa-grid-cols-2 ${COLS[cols]} wa-gap-3`}>
      {items.map((it) => (
        <StatTile key={it.label} {...it} />
      ))}
    </div>
  );
}
