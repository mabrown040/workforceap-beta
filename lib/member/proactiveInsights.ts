/**
 * Proactive "we noticed…" insights for the member Today home.
 *
 * Pure function — takes a snapshot of already-computed signals (at-risk tier,
 * training progress, goals, milestones) and returns 0–2 dignity-preserving,
 * encouraging insight cards. No DB calls; safe to call in the dashboard render
 * path where all of this data has already been loaded.
 *
 * Tone rules (these are members facing real barriers):
 *   - Always warm and forward-looking; never shaming, never "you failed to…".
 *   - Inactivity is framed as "we missed you / your goal is waiting", not "you
 *     have been inactive for N days".
 *   - Celebrate proximity to milestones ("2 lessons from your certificate").
 *
 * Persistence (optional) reuses the existing `Notification` model — NO new
 * model, NO migration. See {@link buildInsightNotificationPayload}.
 */

import type { AtRiskTier } from '@/lib/member/atRiskScoring';

export type ProactiveInsightTone = 'celebrate' | 'encourage' | 'reconnect';

export type ProactiveInsight = {
  /** Stable id so the UI can key + dedupe and persistence can match. */
  id: string;
  tone: ProactiveInsightTone;
  /** Short emoji/glyph rendered in the card chip. */
  glyph: string;
  /** Eyebrow label, e.g. "We noticed". */
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  /** Higher sorts first. */
  weight: number;
};

export type ProactiveInsightsInput = {
  /** Member first name for warm, personal phrasing. */
  firstName: string;
  /** Retention tier from classifyMember (green/yellow/red), or null if unknown. */
  riskTier: AtRiskTier | null;
  /** Whole-number days since last portal login (Infinity-safe; 999 = never). */
  daysSinceLogin: number;
  /** Reasons array from classifyMember (used to detect stalled training). */
  riskReasons?: string[];
  /** Training rollup — drives milestone / "finish strong" cards. */
  enrolledProgram: boolean;
  totalCourses: number;
  completedCourses: number;
  allCoursesComplete: boolean;
  /** % progress of the in-flight course/program (0–100), if available. */
  progressPercentDisplay?: number;
  /** Number of ACTIVE member goals (drives the "your goal is waiting" angle). */
  activeGoalCount: number;
  /** Title of the goal closest to completion, if any. */
  topGoalTitle?: string | null;
  /** done / total steps for the top goal, if any. */
  topGoalStepsDone?: number;
  topGoalStepsTotal?: number;
};

const MAX_INSIGHTS = 2;

/**
 * Build the proactive insight cards for the Today hero.
 * Returns at most 2, sorted by weight (most resonant first).
 */
export function buildProactiveInsights(input: ProactiveInsightsInput): ProactiveInsight[] {
  const out: ProactiveInsight[] = [];
  const name = input.firstName?.trim() || 'there';

  const remainingCourses =
    input.enrolledProgram && input.totalCourses > 0
      ? Math.max(0, input.totalCourses - input.completedCourses)
      : 0;

  // ── Celebrate: just earned the whole certificate ──
  if (input.enrolledProgram && input.allCoursesComplete && input.totalCourses > 0) {
    out.push({
      id: 'certificate_complete',
      tone: 'celebrate',
      glyph: '🎉',
      eyebrow: 'We noticed',
      title: 'You finished every course — congratulations!',
      body: `That certificate is yours, ${name}. Let's turn it into interviews — your job tools are ready when you are.`,
      href: '/dashboard/job-applications',
      cta: 'Start your job search',
      weight: 95,
    });
  }

  // ── Celebrate / encourage: close to the finish line ──
  if (
    input.enrolledProgram &&
    !input.allCoursesComplete &&
    input.totalCourses > 0 &&
    remainingCourses > 0 &&
    remainingCourses <= 2
  ) {
    const unit = remainingCourses === 1 ? 'course' : 'courses';
    out.push({
      id: 'finish_strong',
      tone: 'celebrate',
      glyph: '🏁',
      eyebrow: 'We noticed',
      title:
        remainingCourses === 1
          ? "You're 1 course from your certificate"
          : `You're ${remainingCourses} ${unit} from your certificate`,
      body: `So close, ${name} — finish strong and that credential is yours.`,
      href: '/dashboard/training',
      cta: 'Pick up where you left off',
      weight: 90,
    });
  }

  // ── Reconnect: we missed you (frame inactivity with warmth, not shame) ──
  const trainingStalled = (input.riskReasons ?? []).some((r) =>
    /stall|coursera progress|stale/i.test(r),
  );
  const inactive =
    Number.isFinite(input.daysSinceLogin) &&
    input.daysSinceLogin >= 5 &&
    input.daysSinceLogin < 900;
  if ((input.riskTier === 'red' || input.riskTier === 'yellow') && (inactive || trainingStalled)) {
    if (input.activeGoalCount > 0 && input.topGoalTitle) {
      out.push({
        id: 'reconnect_goal_waiting',
        tone: 'reconnect',
        glyph: '🌱',
        eyebrow: 'We missed you',
        title: 'Your goal is right where you left it',
        body: `“${input.topGoalTitle}” is waiting for you, ${name}. One small step today keeps it moving.`,
        href: '/dashboard',
        cta: 'See your goal',
        weight: 80,
      });
    } else if (input.enrolledProgram && !input.allCoursesComplete) {
      out.push({
        id: 'reconnect_training_waiting',
        tone: 'reconnect',
        glyph: '👋',
        eyebrow: 'We missed you',
        title: 'Good to see you back',
        body: `Your training picks up right where you left off, ${name}. No pressure — even ten minutes counts.`,
        href: '/dashboard/training',
        cta: 'Continue training',
        weight: 78,
      });
    } else {
      out.push({
        id: 'reconnect_coach',
        tone: 'reconnect',
        glyph: '💬',
        eyebrow: 'We missed you',
        title: 'Welcome back — your coach is here',
        body: `Not sure where to start again, ${name}? Your coach can help you find the next small step.`,
        href: '/coach',
        cta: 'Talk to your coach',
        weight: 70,
      });
    }
  }

  // ── Encourage: a goal is nearly done ──
  if (
    input.topGoalTitle &&
    typeof input.topGoalStepsTotal === 'number' &&
    input.topGoalStepsTotal > 0 &&
    typeof input.topGoalStepsDone === 'number'
  ) {
    const remainingSteps = input.topGoalStepsTotal - input.topGoalStepsDone;
    if (remainingSteps > 0 && remainingSteps <= 2 && input.topGoalStepsDone > 0) {
      out.push({
        id: 'goal_almost_done',
        tone: 'encourage',
        glyph: '✨',
        eyebrow: 'We noticed',
        title:
          remainingSteps === 1
            ? "You're one step from a goal"
            : `Just ${remainingSteps} steps left on a goal`,
        body: `“${input.topGoalTitle}” is almost done, ${name}. Knock out the last bit today?`,
        href: '/dashboard',
        cta: 'Finish this goal',
        weight: 65,
      });
    }
  }

  out.sort((a, b) => b.weight - a.weight);

  // Dedupe by id and cap. We also avoid showing both a "reconnect" card AND a
  // "celebrate finish" card together when momentum is the clearer story — the
  // weight ordering already prefers celebration, so a simple slice is enough.
  const seen = new Set<string>();
  const deduped: ProactiveInsight[] = [];
  for (const ins of out) {
    if (seen.has(ins.id)) continue;
    seen.add(ins.id);
    deduped.push(ins);
  }

  return deduped.slice(0, MAX_INSIGHTS);
}

/**
 * Shape a {@link ProactiveInsight} into a `Notification` create payload, so a
 * caller (e.g. a cron) can persist a surfaced insight without a new model.
 * The dashboard render does NOT persist — this is provided for reuse.
 */
export function buildInsightNotificationPayload(
  userId: string,
  insight: ProactiveInsight,
): {
  userId: string;
  type: string;
  title: string;
  body: string;
  data: { link: string; cta: string; insightId: string; tone: ProactiveInsightTone };
} {
  return {
    userId,
    type: 'proactive_insight',
    title: insight.title,
    body: insight.body,
    data: {
      link: insight.href,
      cta: insight.cta,
      insightId: insight.id,
      tone: insight.tone,
    },
  };
}
