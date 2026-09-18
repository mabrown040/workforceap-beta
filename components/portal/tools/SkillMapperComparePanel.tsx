'use client';

import Link from 'next/link';
import { ArrowLeftRight, ListChecks } from 'lucide-react';
import { PortalInlineSpinner } from '@/components/portal/PortalInlineSpinner';
import {
  computeSkillGaps,
  hasComparableSkills,
  type SkillRadarPoint,
} from '@/lib/ai/skillMapperCompare';

const outlinePillStyleSm = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.4rem 0.875rem',
  borderRadius: 999,
  border: '1px solid var(--wa-border)',
  background: 'var(--wa-accent-soft)',
  color: 'var(--wa-accent)',
  fontWeight: 700,
  fontSize: 'var(--wa-type-meta)',
  cursor: 'pointer',
} as const;

export function DualRadarChart({
  memberData,
  targetData,
  size = 260,
}: {
  memberData: SkillRadarPoint[];
  targetData: SkillRadarPoint[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;
  const axes = targetData.length >= memberData.length
    ? targetData.map((point) => point.axis)
    : memberData.map((point) => point.axis);
  const n = axes.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, v: number) => ({
    x: cx + r * v * Math.cos(angle(i)),
    y: cy + r * v * Math.sin(angle(i)),
  });
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const getValue = (data: SkillRadarPoint[], axis: string) =>
    data.find((point) => point.axis === axis)?.value ?? 0;

  if (n < 3) {
    return <p style={{ color: 'var(--wa-muted)', fontSize: 'var(--wa-type-meta)' }}>Not enough axes to chart this comparison.</p>;
  }

  return (
    <svg
      className="skill-mapper-radar-chart"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Your skills versus the target occupation"
      style={{ overflow: 'visible', display: 'block', margin: '0 auto' }}
    >
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={axes.map((_, i) => {
            const p = pt(i, level);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill="none"
          stroke="var(--wa-border)"
          strokeWidth="1"
        />
      ))}
      {axes.map((_, i) => {
        const p = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--wa-border)" strokeWidth="1" />;
      })}
      <polygon
        points={axes.map((axis, i) => {
          const p = pt(i, getValue(targetData, axis));
          return `${p.x},${p.y}`;
        }).join(' ')}
        fill="color-mix(in srgb, var(--wa-accent) 16%, transparent)"
        stroke="var(--wa-accent)"
        strokeWidth="2"
      />
      <polygon
        points={axes.map((axis, i) => {
          const p = pt(i, getValue(memberData, axis));
          return `${p.x},${p.y}`;
        }).join(' ')}
        fill="color-mix(in srgb, var(--wa-info) 20%, transparent)"
        stroke="var(--wa-info)"
        strokeWidth="2"
        strokeDasharray="4 2"
      />
      {axes.map((axis, i) => {
        const p = pt(i, 1.28);
        return (
          <text
            key={axis}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fill="var(--wa-muted)"
          >
            {axis}
          </text>
        );
      })}
    </svg>
  );
}

export function SkillMapperGapList({
  gaps,
  limit,
}: {
  gaps: ReturnType<typeof computeSkillGaps>;
  limit?: number;
}) {
  const shown = typeof limit === 'number' ? gaps.slice(0, limit) : gaps;
  if (shown.length === 0) return null;

  return (
    <div>
      {shown.map((gap) => (
        <div key={gap.axis} className="skill-mapper-gap-row" style={{ marginBottom: '0.75rem' }}>
          <div className="skill-mapper-gap-row__meta" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--wa-type-meta)', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--wa-text)', fontWeight: 600 }}>{gap.axis}</span>
            <span style={{ color: gap.gap > 30 ? 'var(--wa-danger)' : 'var(--wa-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(gap.member)}% → {Math.round(gap.target)}% (+{Math.round(gap.gap)} needed)
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--wa-track)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '100%', width: `${Math.min(100, gap.target)}%`, borderRadius: 4, background: 'color-mix(in srgb, var(--wa-info) 22%, transparent)', position: 'absolute' }} />
            <div style={{ height: '100%', width: `${Math.min(100, gap.member)}%`, borderRadius: 4, background: 'var(--wa-info)', position: 'absolute' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

type SkillMapperComparePanelProps = {
  selectedTitle: string;
  memberProfile: SkillRadarPoint[];
  targetRadar: SkillRadarPoint[];
  loadingProfile: boolean;
  loadingTarget: boolean;
  onOpenFullComparison?: () => void;
};

export default function SkillMapperComparePanel({
  selectedTitle,
  memberProfile,
  targetRadar,
  loadingProfile,
  loadingTarget,
  onOpenFullComparison,
}: SkillMapperComparePanelProps) {
  const ready = hasComparableSkills(memberProfile) && targetRadar.length > 0;
  const gaps = ready ? computeSkillGaps(memberProfile, targetRadar) : [];
  const title = selectedTitle || 'this role';

  return (
    <aside
      className="skill-mapper-compare-panel"
      data-testid="skill-mapper-compare-panel"
      aria-live="polite"
      aria-label={`Comparison with your current skills${selectedTitle ? ` for ${selectedTitle}` : ''}`}
    >
      <h3 className="skill-mapper-compare-panel__title">Your skills vs. {title}</h3>
      <p className="skill-mapper-compare-panel__lede">
        Compared automatically from this search — no extra step.
      </p>

      {(loadingProfile || loadingTarget) && (
        <p className="skill-mapper-compare-panel__status">
          <PortalInlineSpinner size={16} />
          {loadingTarget ? 'Loading occupation skills…' : 'Loading your skills…'}
        </p>
      )}

      {!loadingProfile && !hasComparableSkills(memberProfile) && (
        <div className="skill-mapper-compare-panel__empty">
          <p>
            We do not have a skill profile for you yet, so the gap list stays empty until you add one.
          </p>
          <Link href="/dashboard/learning/interest-profiler" className="wa-kit-focus skill-mapper-compare-panel__link">
            <ListChecks size={15} aria-hidden="true" />
            Take the Interest Profiler
          </Link>
        </div>
      )}

      {ready && (
        <>
          <div className="skill-mapper-radar-wrap" style={{ marginBottom: '0.5rem' }}>
            <DualRadarChart memberData={memberProfile} targetData={targetRadar} size={220} />
          </div>
          <div className="skill-mapper-legend" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '0.75rem', fontSize: 'var(--wa-type-meta)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: 'var(--wa-info)' }} />
              Your skills
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: 'var(--wa-accent)' }} />
              Target role
            </span>
          </div>
          {gaps.length > 0 ? (
            <>
              <h4 className="skill-mapper-compare-panel__gaps-title">Skill gaps to close</h4>
              <SkillMapperGapList gaps={gaps} limit={4} />
            </>
          ) : (
            <p className="skill-mapper-compare-panel__status">
              Your current profile already covers this role’s mapped axes.
            </p>
          )}
          {onOpenFullComparison && (
            <button
              type="button"
              onClick={onOpenFullComparison}
              className="wa-kit-focus"
              style={{ ...outlinePillStyleSm, marginTop: '0.25rem' }}
            >
              <ArrowLeftRight size={14} aria-hidden="true" />
              Open full comparison
            </button>
          )}
        </>
      )}
    </aside>
  );
}
