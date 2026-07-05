import { cx, type KitBaseProps, type KitDataAttrs } from './base';
import { colorVar, type KitColor } from './tokens';

interface StatTileProps extends KitBaseProps<HTMLDivElement>, KitDataAttrs {
  label: string;
  value: string | number;
  /** Small delta line under the value, e.g. "↑ 32 this month". */
  delta?: string;
  /** Color of the value (and delta if no deltaColor). */
  color?: KitColor;
  deltaColor?: KitColor;
}

/**
 * Single metric tile. Used inside <KpiStrip>. Density/radius follow the
 * surface mode automatically via the .wa-kit-card token classes.
 * Mockup: KPI strips across admin/member/concept screens.
 */
export function StatTile({ label, value, delta, color = 'text', deltaColor, className, style, ref, ...rest }: StatTileProps) {
  return (
    <div ref={ref} className={cx('wa-kit-card wa-kit-card--sm wa-kit-card--hover', className)} style={style} {...rest}>
      <div className="wa-kit-stat-label">{label}</div>
      <div className="wa-kit-stat-value" style={{ color: colorVar(color), fontSize: '1.875rem', marginTop: '0.25rem' }}>
        {value}
      </div>
      {delta ? (
        <div style={{ color: colorVar(deltaColor ?? 'success'), fontSize: 10, fontWeight: 700, marginTop: 2 }}>
          {delta}
        </div>
      ) : null}
    </div>
  );
}
