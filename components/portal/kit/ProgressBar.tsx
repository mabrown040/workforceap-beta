import { cx, type KitBaseProps, type KitDataAttrs } from './base';
import { colorVar, type KitColor } from './tokens';

interface ProgressBarProps extends KitBaseProps<HTMLDivElement>, KitDataAttrs {
  /** 0–100. */
  pct: number;
  color?: KitColor;
  'aria-label'?: string;
}

/** Token-styled progress track. Modules, program health, by-program bars. */
export function ProgressBar({ pct, color = 'accent', 'aria-label': ariaLabel, className, style, ref, ...rest }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      ref={ref}
      className={cx('wa-kit-bar-track', className)}
      style={style}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      {...rest}
    >
      <div className="wa-kit-bar-fill" style={{ width: `${clamped}%`, background: colorVar(color) }} />
    </div>
  );
}
