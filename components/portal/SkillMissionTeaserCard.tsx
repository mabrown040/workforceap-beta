import Link from 'next/link';
import { Target, Flame } from 'lucide-react';

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

  let ctaLabel = 'Explore Skill Missions →';
  let statusLine = 'Turn every course you finish into resume-ready career proof.';
  if (hasReady && data?.nextMissionName) {
    ctaLabel = `Start: ${data.nextMissionName} →`;
    statusLine = data.nextMissionCourse
      ? `Mission unlocked for ${data.nextMissionCourse} — prove it and earn a resume bullet.`
      : 'A new mission is unlocked and waiting for you.';
  } else if (hasRetry) {
    ctaLabel = 'Retry your mission →';
    statusLine = 'Your coach left feedback — take another shot at your mission.';
  } else if (hasProgress) {
    ctaLabel = 'View my career proof →';
    statusLine = 'Finish your next course to unlock another mission.';
  } else if (data) {
    statusLine = 'Complete your first course to unlock your first mission.';
  }

  return (
    <section
      aria-label="Skill Missions"
      style={{
        background: 'var(--surface-container-low)',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-xl, 1rem)',
        padding: '1.1rem 1.25rem',
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
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)',
          }}
        >
          <Target size={13} aria-hidden="true" /> Skill Missions
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {data && data.streak > 1 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--color-amber)',
                background: 'rgba(245,158,11,0.12)',
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
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--color-on-surface-variant)',
                whiteSpace: 'nowrap',
              }}
            >
              {data.passedCount}/{data.totalMissions} passed
            </span>
          )}
        </div>
      </div>

      <p
        style={{
          margin: '0 0 0.75rem',
          fontSize: '0.9rem',
          lineHeight: 1.5,
          color: 'var(--color-on-surface)',
        }}
      >
        {statusLine}
      </p>

      {data && data.totalMissions > 0 && (
        <div
          aria-hidden
          style={{
            height: '0.4rem',
            borderRadius: '9999px',
            background: 'color-mix(in srgb, var(--outline-variant) 45%, transparent)',
            overflow: 'hidden',
            marginBottom: '0.85rem',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, data.careerReadinessPct)}%`,
              height: '100%',
              borderRadius: '9999px',
              background: 'var(--color-accent)',
            }}
          />
        </div>
      )}

      <Link
        href="/dashboard/missions"
        className="btn btn-primary"
        style={{ fontSize: '0.88rem', padding: '0.5rem 1rem', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}
      >
        {ctaLabel}
      </Link>
    </section>
  );
}
