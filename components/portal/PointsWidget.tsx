import type { LevelName } from '@/lib/member/pointsConfig';
import { getLevelForPoints, getNextLevel, LEVELS, EVENT_LABELS } from '@/lib/member/pointsConfig';

const LEVEL_ICONS: Record<LevelName, string> = {
  starter:  'sprout',
  builder:  'build',
  achiever: 'star',
  champion: 'emoji_events',
};

type RecentTransaction = {
  id: string;
  event: string;
  points: number;
  note: string | null;
  createdAt: Date;
};

export default function PointsWidget({
  total,
  level,
  recent = [],
  compact = false,
}: {
  total: number;
  level: LevelName;
  recent?: RecentTransaction[];
  compact?: boolean;
}) {
  const levelMeta = getLevelForPoints(total);
  const nextLevel = getNextLevel(level);
  const pctToNext = nextLevel
    ? Math.min(100, Math.round(((total - levelMeta.min) / (nextLevel.min - levelMeta.min)) * 100))
    : 100;
  const icon = LEVEL_ICONS[level];

  if (compact) {
    return (
      <div
        className="portal-kpi-card"
        style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '1.5rem', color: levelMeta.color, '--ms-fill': 1 } as React.CSSProperties}
        >
          {icon}
        </span>
        <div>
          <p className="portal-kpi-card__label">Points</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: levelMeta.color }}>
            {total.toLocaleString()}
          </p>
          <p className="portal-kpi-card__hint">{levelMeta.label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-card portal-card--flat" style={{ padding: '1.25rem' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '1.75rem', color: levelMeta.color, '--ms-fill': 1 } as React.CSSProperties}
          >
            {icon}
          </span>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: '0.15rem' }}>
              My Points
            </p>
            <p style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, margin: 0, color: levelMeta.color }}>
              {total.toLocaleString()}
            </p>
          </div>
        </div>
        <span
          style={{
            background: `${levelMeta.color}18`,
            color: levelMeta.color,
            border: `1px solid ${levelMeta.color}30`,
            borderRadius: 'var(--radius-full)',
            padding: '0.25rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          {levelMeta.label}
        </span>
      </div>

      {/* Progress to next level */}
      {nextLevel && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.35rem' }}>
            <span>{pctToNext}% to {nextLevel.label}</span>
            <span>{nextLevel.min - total} pts needed</span>
          </div>
          <div style={{ height: '6px', background: 'var(--surface-container-highest)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pctToNext}%`, background: levelMeta.color, borderRadius: 'var(--radius-full)', transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}

      {/* Level pills */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: recent.length > 0 ? '1rem' : 0 }}>
        {LEVELS.map((l) => (
          <span
            key={l.name}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '0.25rem 0',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.7rem',
              fontWeight: 700,
              background: l.name === level ? `${l.color}18` : 'transparent',
              color: l.name === level ? l.color : 'var(--color-on-surface-variant)',
              border: `1px solid ${l.name === level ? l.color + '30' : 'transparent'}`,
            }}
          >
            {l.label}
          </span>
        ))}
      </div>

      {/* Recent transactions */}
      {recent.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {recent.map((tx) => (
            <li key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', flex: 1, minWidth: 0 }}>
                {tx.note ?? EVENT_LABELS[tx.event] ?? tx.event}
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-green)', flexShrink: 0 }}>
                +{tx.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
