'use client';

import Link from 'next/link';

type RecapData = {
  weekInReview?: {
    applicationsAdded?: number;
    resourcesCompleted?: number;
    aiToolsUsed?: number;
    pathwayStepsCompleted?: number;
  };
  goalsSnapshot?: Array<{ title: string; status: string }>;
  applicationsCount?: number;
  recommendedActions?: string[];
} | null;

type Props = {
  recap: { id: string; readinessScoreSnapshot: number | null } | null;
  recapData: RecapData;
  weekStart: string;
};

export default function WeeklyRecapClient({ recap, recapData, weekStart }: Props) {
  if (!recap || !recapData) {
    return (
      <div className="weekly-recap-empty">
        <p>No recap generated yet. Check back after you&apos;ve used the portal this week.</p>
        <Link href="/dashboard" className="btn btn-primary">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const week = new Date(weekStart);
  const weekEnd = new Date(week);
  weekEnd.setDate(week.getDate() + 6);
  const weekLabel = `${week.toLocaleDateString('en-US', { month: 'short' })} ${week.getDate()} – ${weekEnd.toLocaleDateString('en-US', { month: 'short' })} ${weekEnd.getDate()}, ${week.getFullYear()}`;

  const review = recapData.weekInReview ?? {};

  return (
    <div className="weekly-recap">
      <p className="weekly-recap-date">{weekLabel}</p>

      {recap.readinessScoreSnapshot != null && (
        <div className="weekly-recap-score">
          <h3>Job Readiness Score</h3>
          <p className="weekly-recap-score-value">{recap.readinessScoreSnapshot}%</p>
        </div>
      )}

      <div className="weekly-recap-section">
        <h3>Your week in review</h3>
        <ul>
          <li>Applications added: {review.applicationsAdded ?? 0}</li>
          <li>Resources completed: {review.resourcesCompleted ?? 0}</li>
          <li>AI tools used: {review.aiToolsUsed ?? 0}</li>
          <li>Pathway steps completed: {review.pathwayStepsCompleted ?? 0}</li>
        </ul>
      </div>

      {recapData.goalsSnapshot && recapData.goalsSnapshot.length > 0 && (
        <div className="weekly-recap-section">
          <h3>Goals</h3>
          <ul>
            {recapData.goalsSnapshot.map((g, i) => (
              <li key={i}>{g.title} — {g.status}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="weekly-recap-section">
        <h3>Recommended actions for next week</h3>
        <ul className="weekly-recap-actions">
          {(recapData.recommendedActions ?? []).map((action, i) => (
            <li key={i}>
              <Link href={
                action.includes('Resume') ? '/ai-tools/resume-rewriter' :
                action.includes('interview') ? '/ai-tools/interview-practice' :
                action.includes('application') ? '/ai-tools/application-tracker' :
                '/dashboard'
              }>
                {action}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <p className="weekly-recap-hint">
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </div>
  );
}
