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
  headline?: string;
  wins?: Array<{ label: string }>;
  pointsThisWeek?: number;
  goalProgress?: Array<{
    title: string;
    status: string;
    stepsDone: number;
    stepsTotal: number;
    percent: number | null;
  }>;
  nextWeekPlan?: Array<{ title: string; cta?: string }>;
};

function isDone(status: string): boolean {
  const u = status.trim().toUpperCase();
  return u === 'COMPLETED' || u === 'COMPLETE' || u === 'DONE';
}

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

  // Lead with an encouraging headline + this week's wins.
  if (recapData?.headline?.trim()) {
    lines.push(recapData.headline.trim(), '');
  }

  const wins = (recapData?.wins ?? []).filter((w) => w?.label?.trim());
  if (wins.length > 0) {
    lines.push('Your wins this week');
    lines.push(...wins.slice(0, 6).map((w) => `• ${w.label.trim()}`));
    lines.push('');
  }

  lines.push('This week in review');
  lines.push(
    `• Applications logged: ${applicationsAdded}`,
    `• Learning resources completed: ${resourcesCompleted}`,
    `• Pathway steps completed: ${pathwayStepsCompleted}`,
    `• Distinct AI tools used: ${aiToolsUsed}`,
  );
  const pointsThisWeek = recapData?.pointsThisWeek ?? 0;
  if (pointsThisWeek > 0) {
    lines.push(`• Momentum points earned: ${pointsThisWeek}`);
  }
  if (newJobs > 0) {
    lines.push(`• New roles on the job board (aligned with your program): ${newJobs}`);
  }
  if (readiness != null && Number.isFinite(readiness)) {
    lines.push(`• Job readiness score: ${Math.round(readiness)}`);
  }

  // Prefer the richer goalProgress when present; fall back to goalsSnapshot.
  const goalProgress = (recapData?.goalProgress ?? []).filter((g) => g?.title?.trim());
  if (goalProgress.length > 0) {
    lines.push('', 'Progress toward your goals');
    for (const g of goalProgress.slice(0, 4)) {
      const detail =
        g.stepsTotal > 0
          ? `${g.stepsDone}/${g.stepsTotal} steps`
          : g.percent != null
            ? `${g.percent}%`
            : isDone(g.status)
              ? 'done'
              : 'in progress';
      const mark = isDone(g.status) ? '✓ ' : '• ';
      lines.push(`${mark}${g.title.trim()} — ${detail}`);
    }
  } else {
    const goals = recapData?.goalsSnapshot ?? [];
    if (goals.length > 0) {
      lines.push('', 'Goal progress');
      lines.push(...goals.slice(0, 4).map(formatGoalLine));
    }
  }

  const plan = (recapData?.nextWeekPlan ?? []).filter((p) => p?.title?.trim());
  if (plan.length > 0) {
    lines.push('', 'Your plan for next week');
    lines.push(...plan.slice(0, 3).map((p) => `• ${p.title.trim()}`));
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
