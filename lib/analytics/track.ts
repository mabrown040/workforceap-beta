import 'server-only';

const ENABLED =
  process.env.ENABLE_ANALYTICS_LOGS === '1' || process.env.ENABLE_ANALYTICS_LOGS === 'true';

function log(tag: string, payload: Record<string, unknown>) {
  if (!ENABLED) return;
  console.info(`[analytics:${tag}]`, JSON.stringify({ ...payload, at: new Date().toISOString() }));
}

export type LearningMilestone = 'course_launched' | 25 | 50 | 75 | 100;

const MILESTONE_THRESHOLDS = [25, 50, 75, 100];

export function getMilestonesCrossed(
  previousPercent: number | null | undefined,
  currentPercent: number | null | undefined
): Array<25 | 50 | 75 | 100> {
  const prev = Math.max(0, Math.min(100, previousPercent ?? 0));
  const curr = Math.max(0, Math.min(100, currentPercent ?? 0));
  const crossed: Array<25 | 50 | 75 | 100> = [];
  for (const m of MILESTONE_THRESHOLDS) {
    if (prev < m && curr >= m) {
      crossed.push(m as 25 | 50 | 75 | 100);
    }
  }
  return crossed;
}

/** Member opened the My Training hub (server render). */
export function trackTrainingTabViewed(userId: string) {
  log('training_tab_view', { userId });
}

/** Member clicked a Coursera launch URL from the portal (server action). */
export function trackCourseraLaunchClicked(userId: string, extra?: { courseSlug?: string | null }) {
  log('coursera_launch_click', { userId, courseSlug: extra?.courseSlug ?? null });
}

/** Record a learning milestone reached server-side (for server logs + downstream replay). */
export function trackLearningMilestoneServer(
  userId: string,
  milestone: LearningMilestone,
  courseSlug: string,
  extra?: Record<string, unknown>
) {
  log('learning_milestone', { userId, milestone: String(milestone), courseSlug, ...extra });
}

/** Inbound xAPI POST finished handling a batch (admin / integration). */
export function trackXapiBatchProcessed(extra: { statementsHandled: number; completionCount?: number }) {
  log('xapi_batch_processed', {
    statementsHandled: extra.statementsHandled,
    completionCount: extra.completionCount ?? 0,
  });
}

/** Supabase auth callback confirmed the member's email (server-side funnel). */
export function trackEmailVerified(payload: {
  user_id: string;
  email_domain: string | null;
  ts: string;
  source: string;
}) {
  log('email_verified', payload);
}
