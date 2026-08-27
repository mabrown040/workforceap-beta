import Link from 'next/link';
import { Target, Flame, ArrowRight } from 'lucide-react';
import { ProgressBar } from '@/components/portal/kit';

/* Dashboard-home teaser for Skill Missions. Server-renderable (no client
   state) — every state links to /dashboard/missions so the feature is always
   one tap away, even before the member has unlocked anything. */

export type SkillMissionTeaserData = {
  careerReadinessPct: number;
  passedCount: number;
  totalMissions: number;
  readyCount: number;
  retryCount: number;
  streak: number;
  nextMissionName: string | null;
  nextMissionCourse: string | null;
};

export default function SkillMissionTeaserCard({
  data,
}: {
  data: SkillMissionTeaserData | null;
}) {
  const hasProgress = !!data && data.passedCount > 0;
  const hasReady = !!data && data.readyCount > 0;
  const hasRetry = !!data && data.retryCount > 0;

  let ctaLabel = 'Explore skill missions';
  let statusLine = 'Turn every course you finish into resume-ready career proof.';
  if (hasReady && data?.nextMissionName) {
    ctaLabel = 'Start challenge';
    statusLine = data.nextMissionCourse
      ? `Mission unlocked for ${data.nextMissionCourse} — prove it and earn a resume bullet.`
      : 'A new mission is unlocked and waiting for you.';
  } else if (hasRetry) {
    ctaLabel = 'Retry your mission';
    statusLine = 'Your coach left feedback — take another shot at your mission.';
  } else if (hasProgress) {
    ctaLabel = 'View my career proof';
    statusLine = 'Finish your next course to unlock another mission.';
  } else if (data) {
    statusLine = 'Complete your first course to unlock your first mission.';
  }

  return (
    <section
      aria-label="Skill missions"
      className="wa-kit-card"
      style={{
        padding: 'var(--wa-pad-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '0.5rem',
        }}
      >
        <p
          style={{
            margin: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: 'var(--wa-type-meta)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--wa-accent)',
          }}
        >
          <Target size={13} aria-hidden="true" /> Skill missions
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {data && data.streak > 1 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontSize: 'var(--wa-type-meta)',
                fontWeight: 700,
                color: 'var(--wa-gold)',
                background: 'var(--wa-gold-soft)',
                padding: '0.12rem 0.5rem',
                borderRadius: '9999px',
                whiteSpace: 'nowrap',
              }}
            >
              <Flame size={12} aria-hidden="true" /> {data.streak} streak
            </span>
          )}
          {data && (
            <span
              style={{
                fontSize: 'var(--wa-type-meta)',
                fontWeight: 700,
                color: 'var(--wa-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {data.passedCount}/{data.totalMissions} passed
            </span>
          )}
        </div>
      </div>

      {hasReady && data?.nextMissionName ? (
        <h3 style={{ margin: '0 0 0.25rem', fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--wa-text)' }}>
          {data.nextMissionName}
        </h3>
      ) : null}

      <p
        style={{
          margin: '0 0 0.75rem',
          fontSize: 'var(--wa-type-body)',
          lineHeight: 1.5,
          color: 'var(--wa-text)',
        }}
      >
        {statusLine}
      </p>

      {data && data.totalMissions > 0 && (
        <div style={{ marginBottom: '0.85rem' }}>
          <ProgressBar
            pct={Math.min(100, data.careerReadinessPct)}
            aria-label={`${data.careerReadinessPct}% of skill missions passed`}
          />
        </div>
      )}

      <Link
        href="/dashboard/missions"
        className="wa-kit-focus hover:wa-opacity-90 wa-inline-flex wa-items-center wa-justify-center"
        style={{
          minHeight: 44,
          maxWidth: '100%',
          padding: '10px 16px',
          borderRadius: 999,
          background: 'var(--wa-accent)',
          color: 'var(--wa-on-accent)',
          fontSize: 'var(--wa-type-body)',
          fontWeight: 700,
          lineHeight: 1.2,
          textDecoration: 'none',
          boxSizing: 'border-box',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          gap: 6,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ctaLabel}</span>
        <ArrowRight size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
      </Link>
    </section>
  );
}
