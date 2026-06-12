'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SkillMissionChallenge from './SkillMissionChallenge';

// ── Local type copies (server-only lib not importable here) ──────────────────

type MissionStatus = 'locked' | 'ready' | 'passed' | 'needs_retry';

type MissionResult = {
  verdict: 'passed' | 'needs_retry';
  coachingNote: string;
  starStory: string;
  resumeBullet: string;
  skillsUnlocked: string[];
};

type QuizQuestion = {
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
};

type SkillMissionSummaryItem = {
  key: string;
  courseSlug: string;
  programSlug: string;
  programTitle: string;
  courseTitle: string;
  missionName: string;
  missionTagline: string;
  primaryAxis: string;
  skillLabels: string[];
  scenarioPrompt: string;
  evidenceHint: string;
  quizQuestions: QuizQuestion[];
  estimatedMinutes: number;
  status: MissionStatus;
  completedAt: Date | null;
  latestResult: MissionResult | null;
  aiToolResultId: string | null;
};

type SkillMissionSummary = {
  programSlug: string;
  programTitle: string | null;
  totalMissions: number;
  passedCount: number;
  readyCount: number;
  retryCount: number;
  streak: number;
  careerReadinessPct: number;
  demonstratedSkills: string[];
  missions: SkillMissionSummaryItem[];
};

type MissionEvalResponse =
  | {
      ok: true;
      verdict: 'passed' | 'needs_retry';
      coachingNote: string;
      starStory: string;
      resumeBullet: string;
      skillsUnlocked: string[];
      aiToolResultId: string | null;
    }
  | { ok: false; error: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPassedDate(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  return `Passed ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

// ── Mission card subcomponents ───────────────────────────────────────────────

function LockedCard({ mission }: { mission: SkillMissionSummaryItem }) {
  return (
    <article
      style={{
        borderRadius: '0.9rem',
        border: '1px solid var(--outline-variant)',
        background: 'var(--surface-container)',
        padding: '0.95rem 1rem',
        opacity: 0.62,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
      }}
    >
      <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>🔒</span>
      <div>
        <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.97rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
          {mission.missionName}
        </h4>
        <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--color-on-surface-variant)' }}>
          Complete <strong>{mission.courseTitle}</strong> to unlock
        </p>
      </div>
    </article>
  );
}

function ReadyCard({
  mission,
  onStart,
}: {
  mission: SkillMissionSummaryItem;
  onStart: () => void;
}) {
  return (
    <article
      style={{
        borderRadius: '0.9rem',
        border: '2px solid var(--color-accent)',
        background: 'color-mix(in srgb, var(--color-accent) 5%, var(--surface-container-low))',
        padding: '1rem 1.1rem',
        boxShadow: '0 8px 24px -12px color-mix(in srgb, var(--color-accent) 30%, transparent)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
              marginBottom: '0.3rem',
            }}
          >
            Mission Ready
          </span>
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
            {mission.missionName}
          </h4>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.86rem', color: 'var(--color-on-surface-variant)' }}>
            {mission.missionTagline}
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.55rem',
            borderRadius: '9999px',
            background: 'var(--surface-container-high)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-on-surface-variant)',
            whiteSpace: 'nowrap',
          }}
        >
          ~{mission.estimatedMinutes} min
        </span>
      </div>

      {mission.skillLabels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
          {mission.skillLabels.slice(0, 4).map((s) => (
            <span
              key={s}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.15rem 0.45rem',
                borderRadius: '9999px',
                background: 'var(--surface-container-high)',
                fontSize: '0.74rem',
                color: 'var(--color-on-surface-variant)',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={onStart}
        style={{ alignSelf: 'flex-start', fontSize: '0.88rem' }}
      >
        Start Mission →
      </button>
    </article>
  );
}

function PassedCard({ mission }: { mission: SkillMissionSummaryItem }) {
  const result = mission.latestResult;
  return (
    <article
      style={{
        borderRadius: '0.9rem',
        border: '1px solid rgba(74,155,79,0.28)',
        background: 'rgba(74,155,79,0.06)',
        padding: '0.95rem 1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>✅</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.97rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              {mission.missionName}
            </h4>
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', color: '#3d8b41' }}>
              {formatPassedDate(mission.completedAt)}
            </p>
          </div>
        </div>
      </div>

      {result && result.skillsUnlocked.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
          {result.skillsUnlocked.map((s) => (
            <span
              key={s}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.15rem 0.45rem',
                borderRadius: '9999px',
                background: 'rgba(74,155,79,0.12)',
                border: '1px solid rgba(74,155,79,0.2)',
                fontSize: '0.73rem',
                fontWeight: 600,
                color: '#256b2a',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {result && result.resumeBullet && (
        <p style={{ margin: '0.25rem 0 0.45rem', fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
          "{result.resumeBullet}"
        </p>
      )}

      {mission.aiToolResultId && (
        <a
          href="/dashboard/career/resume-studio"
          style={{ fontSize: '0.78rem', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}
        >
          View in Resume Studio →
        </a>
      )}
    </article>
  );
}

function RetryCard({
  mission,
  onRetry,
}: {
  mission: SkillMissionSummaryItem;
  onRetry: () => void;
}) {
  const result = mission.latestResult;
  const preview = result?.coachingNote
    ? result.coachingNote.slice(0, 100) + (result.coachingNote.length > 100 ? '…' : '')
    : null;

  return (
    <article
      style={{
        borderRadius: '0.9rem',
        border: '2px solid rgba(194,120,0,0.45)',
        background: 'rgba(194,120,0,0.06)',
        padding: '0.95rem 1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
        <div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#8a5a00',
              marginBottom: '0.25rem',
            }}
          >
            Review needed
          </span>
          <h4 style={{ margin: 0, fontSize: '0.97rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            {mission.missionName}
          </h4>
        </div>
        <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>💪</span>
      </div>

      {preview && (
        <p style={{ margin: '0 0 0.65rem', fontSize: '0.83rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
          {preview}
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={onRetry}
        style={{ fontSize: '0.85rem', background: '#8a5a00', borderColor: '#8a5a00' }}
      >
        Retry Mission →
      </button>
    </article>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function SkillMissionPanel({ summary }: { summary: SkillMissionSummary | null }) {
  const router = useRouter();
  const [activeMission, setActiveMission] = useState<SkillMissionSummaryItem | null>(null);

  if (!summary || summary.totalMissions === 0) return null;

  function handleComplete(_result: MissionEvalResponse & { ok: true }) {
    setActiveMission(null);
    router.refresh();
  }

  return (
    <>
      <section
        style={{
          background: 'var(--surface-container-low)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.25rem',
          border: '1px solid var(--outline-variant)',
          marginBottom: '1.5rem',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '1rem' }}>
          <p
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
              margin: '0 0 0.3rem',
            }}
          >
            Skill Missions
          </p>
          <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.15rem', fontWeight: 800 }}>
            Your Career Proof Journey
          </h3>
          <p style={{ margin: 0, fontSize: '0.87rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
            Turn your training into employer-ready evidence — one mission at a time.
          </p>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '0.9rem',
          }}
        >
          {/* Career readiness big number */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.3rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '0.7rem',
              background: 'color-mix(in srgb, var(--color-accent) 8%, var(--surface-container))',
              border: '1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)',
            }}
          >
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1 }}>
              {summary.careerReadinessPct}%
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
              career-ready
            </span>
          </div>

          {/* Passed count */}
          <span className="training-status-chip training-status-chip--complete">
            {summary.passedCount} passed
          </span>

          {/* Ready count */}
          {summary.readyCount > 0 && (
            <span className="training-status-chip training-status-chip--progress">
              {summary.readyCount} ready
            </span>
          )}

          {/* Retry count */}
          {summary.retryCount > 0 && (
            <span className="training-status-chip training-status-chip--pending">
              {summary.retryCount} to retry
            </span>
          )}

          {/* Streak badge */}
          {summary.streak > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '9999px',
                background: 'rgba(230,120,0,0.12)',
                border: '1px solid rgba(230,120,0,0.25)',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#8a4a00',
              }}
            >
              🔥 {summary.streak} streak
            </span>
          )}
        </div>

        {/* Demonstrated skills chips */}
        {summary.demonstratedSkills.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>
              Skills you&apos;ve demonstrated
            </p>
            <div
              style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}
            >
              {summary.demonstratedSkills.slice(0, 10).map((skill) => (
                <span
                  key={skill}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px',
                    background: 'rgba(74,155,79,0.1)',
                    border: '1px solid rgba(74,155,79,0.2)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#256b2a',
                    animation: 'fadeIn 0.4s ease both',
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Mission list */}
        <div style={{ display: 'grid', gap: '0.85rem' }}>
          {summary.missions.map((mission) => {
            if (mission.status === 'locked') {
              return <LockedCard key={mission.key} mission={mission} />;
            }
            if (mission.status === 'ready') {
              return (
                <ReadyCard
                  key={mission.key}
                  mission={mission}
                  onStart={() => setActiveMission(mission)}
                />
              );
            }
            if (mission.status === 'passed') {
              return <PassedCard key={mission.key} mission={mission} />;
            }
            if (mission.status === 'needs_retry') {
              return (
                <RetryCard
                  key={mission.key}
                  mission={mission}
                  onRetry={() => setActiveMission(mission)}
                />
              );
            }
            return null;
          })}
        </div>
      </section>

      {/* Challenge modal */}
      {activeMission && (
        <SkillMissionChallenge
          mission={activeMission}
          onClose={() => setActiveMission(null)}
          onComplete={handleComplete}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
