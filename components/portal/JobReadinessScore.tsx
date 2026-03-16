'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ScoreBreakdown } from '@/lib/readiness/score';

type JobReadinessScoreProps = {
  score: number;
  nextAction?: { label: string; href: string };
  breakdown?: ScoreBreakdown;
};

const BREAKDOWN_LABELS: Record<keyof ScoreBreakdown, string> = {
  completeProfile: 'Complete profile',
  setGoals: 'Set goals',
  buildResume: 'Build resume',
  complete2Resources: 'Complete 2 resources',
  practiceInterview: 'Practice interview',
  startPathway: 'Start pathway',
  completePathwaySteps: 'Complete pathway steps',
  addApplications: 'Add applications',
  trackCertifications: 'Track certifications',
  weeklyConsistency: 'Recent activity',
};

export default function JobReadinessScore({ score, nextAction, breakdown }: JobReadinessScoreProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="job-readiness-score" role="status" aria-label={`Job readiness: ${score}%`}>
      <div className="job-readiness-header">
        <h3 className="job-readiness-title">Job Readiness Score</h3>
        <span className="job-readiness-value">{score}%</span>
      </div>
      <div className="job-readiness-track">
        <div
          className="job-readiness-fill"
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      {breakdown && (
        <>
          <button
            type="button"
            className="job-readiness-breakdown-toggle"
            onClick={() => setShowBreakdown(!showBreakdown)}
          >
            {showBreakdown ? 'Hide' : 'Show'} breakdown
          </button>
          {showBreakdown && (
            <ul className="job-readiness-breakdown">
              {(Object.entries(breakdown) as [keyof ScoreBreakdown, { earned: number; max: number; done: boolean }][]).map(([key, b]) => (
                <li key={key} className={b.done ? 'done' : ''}>
                  {b.done ? '✓' : '○'} {BREAKDOWN_LABELS[key]}: {b.earned}/{b.max}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {nextAction && (
        <p className="job-readiness-next">
          <strong>Next:</strong>{' '}
          <Link href={nextAction.href}>{nextAction.label}</Link>
        </p>
      )}
    </div>
  );
}
