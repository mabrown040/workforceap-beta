'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SkillMissionChallenge from './SkillMissionChallenge';
import {
  SectionHeader,
  StatTile,
  StatusTag,
  ProgressBar,
} from './kit';

// ── Local type copies (server-only lib not importable here) ──────────────────

type MissionStatus = 'locked' | 'ready' | 'passed' | 'needs_retry';

type MissionResult = {
  verdict: 'passed' | 'needs_retry';
  coachingNote: string;
  starStory: string;
  resumeBullet: string;
  skillsUnlocked: string[];
};

/* Answers are server-only — the summary ships question text/options only. */
type QuizQuestion = {
  text: string;
  options: [string, string, string, string];
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
      className="wa-kit-card wa-kit-card--sm"
      style={{
        opacity: 0.62,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
      }}
    >
      <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>🔒</span>
      <div>
        <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.97rem', fontWeight: 700, color: 'var(--wa-text)' }}>
          {mission.missionName}
        </h4>
        <StatusTag tone="muted">
          Complete {mission.courseTitle} to unlock
        </StatusTag>
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
      className="wa-kit-card"
      style={{ borderColor: 'var(--wa-accent)', borderWidth: 2 }}
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
              color: 'var(--wa-accent)',
              marginBottom: '0.3rem',
            }}
          >
            Mission Ready
          </span>
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--wa-text)' }}>
            {mission.missionName}
          </h4>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.86rem', color: 'var(--wa-muted)' }}>
            {mission.missionTagline}
          </p>
        </div>
        <StatusTag tone="info">~{mission.estimatedMinutes} min</StatusTag>
      </div>

      {mission.skillLabels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
          {mission.skillLabels.slice(0, 4).map((s) => (
            <StatusTag key={s} tone="muted">
              {s}
            </StatusTag>
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
    <article className="wa-kit-card wa-kit-card--sm">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>✅</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.97rem', fontWeight: 700, color: 'var(--wa-text)' }}>
              {mission.missionName}
            </h4>
            <div style={{ marginTop: '0.25rem' }}>
              <StatusTag tone="ok">{formatPassedDate(mission.completedAt)}</StatusTag>
            </div>
          </div>
        </div>
      </div>

      {result && result.skillsUnlocked.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
          {result.skillsUnlocked.map((s) => (
            <StatusTag key={s} tone="ok">
              {s}
            </StatusTag>
          ))}
        </div>
      )}

      {result && result.resumeBullet && (
        <p style={{ margin: '0.25rem 0 0.45rem', fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--wa-muted)', lineHeight: 1.5 }}>
          "{result.resumeBullet}"
        </p>
      )}

      {mission.aiToolResultId && (
        <a
          href="/dashboard/ai-tools/resume-studio"
          style={{ fontSize: '0.78rem', color: 'var(--wa-accent)', textDecoration: 'none', fontWeight: 600 }}
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
      className="wa-kit-card wa-kit-card--sm"
      style={{ borderColor: 'var(--wa-gold)', borderWidth: 2 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
        <div>
          <div style={{ marginBottom: '0.3rem' }}>
            <StatusTag tone="warn">Review needed</StatusTag>
          </div>
          <h4 style={{ margin: 0, fontSize: '0.97rem', fontWeight: 700, color: 'var(--wa-text)' }}>
            {mission.missionName}
          </h4>
        </div>
        <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>💪</span>
      </div>

      {preview && (
        <p style={{ margin: '0 0 0.65rem', fontSize: '0.83rem', color: 'var(--wa-muted)', lineHeight: 1.5 }}>
          {preview}
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={onRetry}
        style={{ fontSize: '0.85rem', background: 'var(--wa-gold)', borderColor: 'var(--wa-gold)' }}
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
      <section className="wa-kit-card" style={{ marginBottom: '1.5rem' }}>
        {/* Header */}
        <SectionHeader
          kicker="Skill Missions"
          title="Your Career Proof Journey"
          goal="Turn your training into employer-ready evidence — one mission at a time."
        />

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
          {/* Career readiness */}
          <div style={{ minWidth: '9rem' }}>
            <StatTile
              label="missions passed"
              value={`${summary.careerReadinessPct}%`}
              color="accent"
            />
            <div style={{ marginTop: '0.5rem' }}>
              <ProgressBar pct={summary.careerReadinessPct} color="accent" aria-label="Missions passed" />
            </div>
          </div>

          {/* Passed count */}
          <StatusTag tone="ok">{summary.passedCount} passed</StatusTag>

          {/* Ready count */}
          {summary.readyCount > 0 && (
            <StatusTag tone="info">{summary.readyCount} ready</StatusTag>
          )}

          {/* Retry count */}
          {summary.retryCount > 0 && (
            <StatusTag tone="warn">{summary.retryCount} to retry</StatusTag>
          )}

          {/* Streak badge */}
          {summary.streak > 0 && (
            <StatusTag tone="warn">🔥 {summary.streak} streak</StatusTag>
          )}
        </div>

        {/* Demonstrated skills chips */}
        {summary.demonstratedSkills.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--wa-muted)' }}>
              Skills you&apos;ve demonstrated
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {summary.demonstratedSkills.slice(0, 10).map((skill) => (
                <StatusTag key={skill} tone="ok">
                  {skill}
                </StatusTag>
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
          onClose={() => {
            setActiveMission(null);
            // A needs_retry result is recorded server-side even when the
            // member closes instead of completing — refresh so the card
            // flips from "Start Mission" to "Retry Mission" immediately.
            router.refresh();
          }}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
