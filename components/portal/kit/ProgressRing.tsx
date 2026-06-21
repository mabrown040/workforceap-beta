import { colorVar, type KitColor } from './tokens';

interface ProgressRingProps {
  /** 0–100. */
  pct: number;
  size?: number;
  color?: KitColor;
  /** Use on a colored/gradient background (track becomes translucent white). */
  onDark?: boolean;
  /** Show the % label in the center (default true). */
  showLabel?: boolean;
}

const R = 52;
const CIRC = 2 * Math.PI * R; // 326.7

/**
 * SVG progress ring. Member program/readiness + the Bold concept hero.
 * Pure SVG, no deps. Pass onDark for the gradient-hero variant.
 */
export function ProgressRing({ pct, size = 120, color = 'accent', onDark = false, showLabel = true }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = CIRC * (1 - clamped / 100);
  const stroke = onDark ? '#ffffff' : colorVar(color);
  const track = onDark ? 'rgba(255,255,255,0.2)' : '#f0eef0';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={R} fill="none" stroke={track} strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
      </svg>
      {showLabel ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 800,
            fontSize: size * 0.22,
            color: stroke,
          }}
        >
          {clamped}%
        </div>
      ) : null}
    </div>
  );
}
