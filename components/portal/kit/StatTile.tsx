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
 * Single metric tile — kit-native `.wa-kit-card` + `.wa-kit-stat-*` on `--wa-*`.
 * Used inside <KpiStrip>.
 */
export function StatTile({
  label,
  value,
  delta,
  color = 'text',
  deltaColor,
  className,
  style,
  ref,
  ...rest
}: StatTileProps) {
  return (
    <div ref={ref} className={cx(className)} style={style} {...rest}>
      <div className="wa-kit-card wa-kit-card--sm" style={{ height: '100%' }}>
        <div className="wa-kit-stat-label">{label}</div>
        <div
          className="wa-kit-stat-value"
          style={{ color: colorVar(color), fontSize: '1.875rem', marginTop: 4 }}
        >
          {value}
        </div>
        {delta ? (
          <div
            style={{
              color: colorVar(deltaColor ?? 'success'),
              fontSize: 10,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {delta}
          </div>
        ) : null}
      </div>
    </div>
  );
}
