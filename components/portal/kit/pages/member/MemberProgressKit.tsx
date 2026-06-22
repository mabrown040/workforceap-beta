import { Check, Zap, Flag } from 'lucide-react';
import type { ReactNode } from 'react';
import { DesignSurface } from '@/components/portal/kit';

/**
 * Member Portal — MY PROGRESS view (readiness score + weekly stats + milestones).
 * Faithful port of `data-view-panel="progress"` in
 * docs/mockups/workforceap-member-suite.html.
 *
 * Target route: app/(portal)/dashboard/progress
 * Surface: warm (member-facing).
 */

interface WeekStat {
  value: string;
  label: string;
  color: string;
}

type MilestoneState = 'done' | 'active' | 'goal';

interface Milestone {
  label: string;
  when: string;
  state: MilestoneState;
}

export interface MemberProgressKitProps {
  /** Job-readiness score 0–100. */
  readinessScore?: number;
  readinessNote?: string;
  weekStats?: WeekStat[];
  milestones?: Milestone[];
}

const RING_R = 52;
const RING_CIRC = 2 * Math.PI * RING_R;

const DEFAULT_WEEK_STATS: WeekStat[] = [
  { value: '5.2', label: 'Hrs Learned', color: 'var(--wa-accent)' },
  { value: '3', label: 'Jobs Applied', color: 'var(--wa-info)' },
  { value: '2', label: 'Modules', color: 'var(--wa-gold)' },
  { value: '+320', label: 'Points', color: 'var(--wa-success)' },
];

const DEFAULT_MILESTONES: Milestone[] = [
  { label: 'Completed intake & eligibility', when: 'May 2', state: 'done' },
  { label: 'Earned first certification', when: 'Mar 18', state: 'done' },
  { label: 'First interview scheduled', when: 'This week', state: 'active' },
  { label: 'Job placement', when: 'Goal', state: 'goal' },
];

const MILESTONE_META: Record<MilestoneState, { icon: ReactNode; iconBg: string; iconColor: string; whenColor: string; dim: boolean }> = {
  done: { icon: <Check size={13} />, iconBg: 'var(--wa-success)', iconColor: '#fff', whenColor: 'var(--wa-muted)', dim: false },
  active: { icon: <Zap size={11} />, iconBg: 'var(--wa-accent)', iconColor: '#fff', whenColor: 'var(--wa-accent)', dim: false },
  goal: { icon: <Flag size={11} />, iconBg: '#e8e8e8', iconColor: '#a3a3a3', whenColor: '#a3a3a3', dim: true },
};

export function MemberProgressKit({
  readinessScore = 84,
  readinessNote = "You're in the top 20% of your cohort. Finish AWS Practitioner to reach “Job Ready”.",
  weekStats = DEFAULT_WEEK_STATS,
  milestones = DEFAULT_MILESTONES,
}: MemberProgressKitProps) {
  const score = Math.max(0, Math.min(100, Math.round(readinessScore)));
  const offset = RING_CIRC * (1 - score / 100);

  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-3 wa-gap-5">
          {/* Job readiness ring */}
          <div className="wa-kit-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <h3
              style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--wa-muted)', marginBottom: 12 }}
            >
              Job Readiness
            </h3>
            <div style={{ position: 'relative', width: 160, height: 160 }}>
              <svg width={160} height={160} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={RING_R} fill="none" stroke="#f0eef0" strokeWidth="11" />
                <circle
                  cx="60"
                  cy="60"
                  r={RING_R}
                  fill="none"
                  stroke="var(--wa-success)"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={offset}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--wa-success)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {score}
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--wa-muted)', letterSpacing: '0.08em' }}>OF 100</span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 12 }}>{readinessNote}</p>
          </div>

          {/* This week + milestones (2-wide) */}
          <div className="wa-kit-card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', marginBottom: 16 }}>This Week</h3>
            <div className="wa-grid wa-grid-cols-2 sm:wa-grid-cols-4 wa-gap-3" style={{ marginBottom: 20 }}>
              {weekStats.map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center', padding: 12, background: 'var(--wa-bg)', borderRadius: 'var(--wa-radius-sm)' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--wa-muted)' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <h4 style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--wa-muted)', marginBottom: 12 }}>
              Milestones
            </h4>
            <div className="wa-space-y-3">
              {milestones.map((m) => {
                const meta = MILESTONE_META[m.state];
                return (
                  <div key={m.label} className="wa-flex wa-items-center wa-gap-3" style={{ opacity: meta.dim ? 0.6 : 1 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: meta.iconBg,
                        color: meta.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {meta.icon}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: meta.dim ? 'var(--wa-muted)' : 'var(--wa-text)' }}>{m.label}</span>
                    <span style={{ fontSize: 10, fontWeight: m.state === 'active' ? 700 : 400, color: meta.whenColor }}>{m.when}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DesignSurface>
  );
}
