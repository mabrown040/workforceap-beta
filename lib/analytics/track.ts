import 'server-only';

const ENABLED =
  process.env.ENABLE_ANALYTICS_LOGS === '1' || process.env.ENABLE_ANALYTICS_LOGS === 'true';

function log(tag: string, payload: Record<string, unknown>) {
  if (!ENABLED) return;
  console.info(`[analytics:${tag}]`, JSON.stringify({ ...payload, at: new Date().toISOString() }));
}

/** Member opened the My Training hub (server render). */
export function trackTrainingTabViewed(userId: string) {
  log('training_tab_view', { userId });
}

/** Member clicked a Coursera launch URL from the portal (server action). */
export function trackCourseraLaunchClicked(userId: string, extra?: { courseSlug?: string | null }) {
  log('coursera_launch_click', { userId, courseSlug: extra?.courseSlug ?? null });
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
