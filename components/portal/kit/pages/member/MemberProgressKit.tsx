import { Check, Mic, TrendingUp, Zap, Flag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DesignSurface, PageOpener, ProgressRing } from '@/components/portal/kit';

/**
 * Member Portal — progress / readiness (kit ProgressRing + weekly stats +
 * milestones). Live at `/dashboard/readiness`; proof at `/dev/member/progress`.
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
  statsHeading?: string;
  milestones?: Milestone[];
  readinessCoachHref?: string;
}

const DEFAULT_WEEK_STATS: WeekStat[] = [];

const DEFAULT_MILESTONES: Milestone[] = [];

const MILESTONE_META: Record<MilestoneState, { icon: LucideIcon; iconSize: number; iconBg: string; iconColor: string; whenColor: string; dim: boolean }> = {
  done: { icon: Check, iconSize: 14, iconBg: 'var(--wa-success)', iconColor: 'var(--wa-on-accent)', whenColor: 'var(--wa-muted)', dim: false },
  active: { icon: Zap, iconSize: 14, iconBg: 'var(--wa-accent)', iconColor: 'var(--wa-on-accent)', whenColor: 'var(--wa-accent)', dim: false },
  goal: { icon: Flag, iconSize: 14, iconBg: 'var(--wa-surface-2)', iconColor: 'var(--wa-muted)', whenColor: 'var(--wa-muted)', dim: true },
};

export function MemberProgressKit({
  readinessScore = 0,
  readinessNote = 'Complete Training Preassessment to see a score.',
  weekStats = DEFAULT_WEEK_STATS,
  statsHeading = 'Progress by area',
  milestones = DEFAULT_MILESTONES,
  readinessCoachHref = '/dashboard/ai-tools/studio?tab=session&agent=readiness',
}: MemberProgressKitProps) {
  const score = Math.max(0, Math.min(100, Math.round(readinessScore)));

  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--wa-pad-sm)' }} className="wa-space-y-6">
        <PageOpener
          kicker="Progress"
          title="Readiness"
          lede="Score, this week, next milestone."
          icon={<TrendingUp size={13} aria-hidden="true" />}
        />
        <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-3 wa-gap-5">
          {/* Job readiness ring */}
          <div className="wa-kit-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <h2
              className="wa-kit-meta"
              style={{ fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}
            >
              Score
            </h2>
            <ProgressRing pct={score} size={160} color="success" label="Readiness score" />
            <p className="wa-kit-lede" style={{ marginTop: 12 }}>{readinessNote}</p>
            <a
              href={readinessCoachHref}
              className="wa-kit-cta wa-kit-cta--block wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
              style={{ marginTop: 16 }}
            >
              <Mic size={14} aria-hidden />
              Open readiness coach
            </a>
          </div>

          {/* This week + milestones (2-wide on lg; full-width single column on
              mobile/tablet — span only applies where the 3-col grid exists so
              it can't force an overflowing implicit track at narrow widths). */}
          <div className="wa-kit-card lg:wa-col-span-2">
            <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', marginBottom: 16 }}>{statsHeading}</h2>
            {weekStats.length === 0 ? (
              <p className="wa-kit-lede" style={{ marginBottom: 24 }}>
                Category scores appear after Training Preassessment.{' '}
                <a
                  href="/dashboard/assessment"
                  className="wa-kit-focus"
                  style={{ color: 'var(--wa-accent)', fontWeight: 700, textDecoration: 'none' }}
                >
                  Open skills check
                </a>
              </p>
            ) : (
            <div className="wa-grid wa-grid-cols-2 sm:wa-grid-cols-4 wa-gap-3" style={{ marginBottom: 24 }}>
              {weekStats.map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center', padding: 12, background: 'var(--wa-surface-2)', borderRadius: 'var(--wa-radius-sm)' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
                  <div className="wa-kit-meta" style={{ fontWeight: 600, marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
            )}

            <h3 style={{ fontWeight: 700, fontSize: 'var(--wa-type-meta)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--wa-muted)', marginBottom: 12 }}>
              Milestones
            </h3>
            {milestones.length === 0 ? (
              <p className="wa-kit-lede">Milestones fill in as you complete intake, training, and interviews.</p>
            ) : (
            <div className="wa-space-y-3">
              {milestones.map((m) => {
                const meta = MILESTONE_META[m.state];
                const Icon = meta.icon;
                return (
                  <div key={m.label} className="wa-flex wa-items-center wa-gap-3" style={{ opacity: meta.dim ? 0.6 : 1 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        background: meta.iconBg,
                        color: meta.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={meta.iconSize} aria-hidden="true" />
                    </div>
                    <span style={{ fontSize: 'var(--wa-type-body)', fontWeight: 600, flex: 1, minWidth: 0, color: meta.dim ? 'var(--wa-muted)' : 'var(--wa-text)' }}>{m.label}</span>
                    <span style={{ fontSize: 'var(--wa-type-meta)', fontWeight: m.state === 'active' ? 700 : 500, color: meta.whenColor, flexShrink: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{m.when}</span>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
      </div>
    </DesignSurface>
  );
}
