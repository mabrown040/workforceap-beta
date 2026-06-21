import { colorVar, type KitColor } from './tokens';

interface ProgressBarProps {
  /** 0–100. */
  pct: number;
  color?: KitColor;
  'aria-label'?: string;
}

/** Token-styled progress track. Modules, program health, by-program bars. */
export function ProgressBar({ pct, color = 'accent', 'aria-label': ariaLabel }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="wa-kit-bar-track"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div className="wa-kit-bar-fill" style={{ width: `${clamped}%`, background: colorVar(color) }} />
    </div>
  );
}
