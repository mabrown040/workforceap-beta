'use client';

import Link from 'next/link';

type JobReadinessScoreProps = {
  score: number;
  nextAction?: { label: string; href: string };
};

export default function JobReadinessScore({ score, nextAction }: JobReadinessScoreProps) {
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
      {nextAction && (
        <p className="job-readiness-next">
          <strong>Next:</strong>{' '}
          <Link href={nextAction.href}>{nextAction.label}</Link>
        </p>
      )}
    </div>
  );
}
