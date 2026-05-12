/**
 * Plain-text body for sendWeeklyRecapEmail — newlines preserved for nl2br in the template.
 */

export type WeeklyRecapJsonForEmail = {
  weekInReview?: {
    applicationsAdded?: number;
    resourcesCompleted?: number;
    aiToolsUsed?: number;
    pathwayStepsCompleted?: number;
    newLiveJobsThisWeek?: number;
  };
  goalsSnapshot?: Array<{
    title: string;
    status: string;
    currentMetricValue?: number | null;
    targetMetricValue?: number | null;
  }>;
  recommendedActions?: string[];
  readinessScoreSnapshot?: number | null;
  upcomingCounselorSessions?: Array<{ at: string; topic: string | null }>;
};

function formatGoalLine(g: NonNullable<WeeklyRecapJsonForEmail['goalsSnapshot']>[number]): string {
  const metric =
    g.currentMetricValue != null && g.targetMetricValue != null
      ? ` (${g.currentMetricValue}/${g.targetMetricValue})`
      : '';
  return `• ${g.title} — ${g.status}${metric}`;
}

export function buildWeeklyRecapEmailSummary(recapData: WeeklyRecapJsonForEmail | null | undefined): string {
  const review = recapData?.weekInReview ?? {};
  const applicationsAdded = review.applicationsAdded ?? 0;
  const resourcesCompleted = review.resourcesCompleted ?? 0;
  const aiToolsUsed = review.aiToolsUsed ?? 0;
  const pathwayStepsCompleted = review.pathwayStepsCompleted ?? 0;
  const newJobs = review.newLiveJobsThisWeek ?? 0;
  const readiness = recapData?.readinessScoreSnapshot;

  const lines: string[] = [];

  lines.push('This week in review');
  lines.push(
    `• Applications logged: ${applicationsAdded}`,
    `• Learning resources completed: ${resourcesCompleted}`,
    `• Pathway steps completed: ${pathwayStepsCompleted}`,
    `• Distinct AI tools used: ${aiToolsUsed}`,
  );
  if (newJobs > 0) {
    lines.push(`• New roles on the job board (aligned with your program): ${newJobs}`);
  }
  if (readiness != null && Number.isFinite(readiness)) {
    lines.push(`• Job readiness score: ${Math.round(readiness)}`);
  }

  const goals = recapData?.goalsSnapshot ?? [];
  if (goals.length > 0) {
    lines.push('', 'Goal progress');
    lines.push(...goals.slice(0, 4).map(formatGoalLine));
  }

  const sessions = recapData?.upcomingCounselorSessions ?? [];
  if (sessions.length > 0) {
    lines.push('', 'Upcoming mentor / counselor sessions');
    for (const s of sessions) {
      const topic = s.topic?.trim() ? ` — ${s.topic.trim()}` : '';
      lines.push(`• ${s.at}${topic}`);
    }
  }

  const actions = (recapData?.recommendedActions ?? []).filter(Boolean).slice(0, 5);
  if (actions.length > 0) {
    lines.push('', 'Suggested AI tools & next steps');
    lines.push(...actions.map((a) => `• ${a}`));
  }

  return lines.join('\n');
}
