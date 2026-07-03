import { prisma } from '@/lib/db/prisma';
import { getMemberState } from '@/lib/member/getMemberState';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';
import { getRiskLevel } from '@/lib/member/atRiskScoring';

/** Application statuses that are still "in flight" — not yet hired or rejected. */
const OPEN_APPLICATION_STATUSES = ['pending', 'reviewing', 'interview', 'offered'] as const;

/** Budget for the CoachMemory summary line surfaced to text tools — keep terse. */
const COACH_MEMORY_SUMMARY_MAX_CHARS = 400;

/**
 * AI Coach Context — Sprint R2 (2026-Q3)
 *
 * The shared, stateful memory layer that all AI tool routes can consult.
 * Stops every tool from being a one-shot: the resume rewriter now knows the
 * member has practiced interviews, the cover letter knows about a recent
 * resume rewrite, etc.
 *
 * Composes existing helpers — does NOT re-query Prisma except for the
 * `recentToolResults` slice that no other helper exposes.
 */

export type AICoachContext = {
  member: {
    fullName: string;
    targetRole: string | null;
    inferredExperienceLevel: 'entry' | 'mid' | 'senior';
    programInterest: string | null;
  };
  recentToolResults: Array<{
    toolType: string;
    summary: string;
    createdAt: Date;
    parentToolResultId: string | null;
  }>;
  resumeContext: string;
  hasResume: boolean;
  hasCompletedInterviewPractice: boolean;
  /**
   * Self-reported employment barriers (WIOA reporting). Additive — present so
   * tools can respond with empathy + specificity instead of generic advice.
   */
  barriers: {
    hasEmploymentBarrier: boolean;
    barrierTypes: string[];
  };
  /**
   * Top recommended career titles (from the member's career assessment), most
   * confident first. Empty when no recommendation has been generated.
   */
  recommendedCareers: string[];
  /**
   * Lightweight, model-friendly snapshot of the assessment answers — only
   * populated when the member completed the assessment.
   */
  assessmentSummary: string | null;
  /** The member's active (in-progress) goals, newest first. */
  activeGoals: Array<{
    title: string;
    goalType: string;
    progress: string | null;
  }>;
  /**
   * Small, bounded snapshot of where the member is in the job pipeline —
   * lets tools avoid suggesting "start applying" to someone already mid-process.
   */
  jobPipeline: {
    /** Applications not yet in a terminal state (hired/rejected). */
    openApplicationCount: number;
    /** Statuses of the most recent applications (newest first, max 5). */
    recentApplicationStatuses: string[];
    /** Titles from the most recent AI-suggested job matches (max 5). */
    recentMatchTitles: string[];
  };
  /**
   * Retention risk tier from the latest AtRiskAlert row, derived from its
   * stored score via the same thresholds the counselor queue uses. Null when
   * no alert has ever been generated for this member.
   */
  atRiskTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  /**
   * One-way read of the voice coach's rolling memory (CoachMemory table, see
   * lib/coach/memory.ts). Text tools never write back here — that's a bigger
   * design than a read-only unification pass. Null when the member has never
   * had a CoachMemory row created (e.g. no voice coach session yet).
   */
  coachMemory: {
    summary: string;
    lastTopic: string | null;
  } | null;
};

export type AICoachContextOptions = {
  /** How many recent tool results to include (default 5). */
  recentResultsLimit?: number;
  /** Resume text size budget — default 6000 chars. */
  resumeMaxChars?: number;
};

/**
 * Load the AI coach context for a member. Safe to call from any AI route.
 * Pulls from already-cached `getMemberState`, latest resume text, and the
 * five most recent tool results.
 */
export async function getAICoachContext(
  userId: string,
  options: AICoachContextOptions = {}
): Promise<AICoachContext> {
  const limit = options.recentResultsLimit ?? 5;
  const resumeBudget = options.resumeMaxChars ?? 6000;

  const [state, resumeText, recentRows, personalRow, goalRows, openApplicationCount, recentApplicationRows, recentMatchRows, latestAlert, coachMemoryRow] = await Promise.all([
    getMemberState(userId),
    getMemberResumePlainText(userId, resumeBudget, { preferOriginal: false }).catch(() => ''),
    prisma.aIToolResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        toolType: true,
        inputSummary: true,
        createdAt: true,
        parentToolResultId: true,
      },
    }).catch(() => [] as Array<{
      toolType: string;
      inputSummary: string;
      createdAt: Date;
      parentToolResultId: string | null;
    }>),
    // Barriers + assessment answers — not exposed by getMemberState, so query
    // the minimal slice here. Career recommendation comes from `state`.
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        assessmentAnswers: true,
        profile: {
          select: { hasEmploymentBarrier: true, barrierTypes: true },
        },
      },
    }).catch(() => null),
    prisma.goal.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        title: true,
        goalType: true,
        currentMetricValue: true,
        targetMetricValue: true,
      },
    }).catch(() => [] as Array<{
      title: string;
      goalType: string;
      currentMetricValue: number;
      targetMetricValue: number | null;
    }>),
    // Job-pipeline snapshot — bounded queries only, reused for the "where are
    // they already in the process" signal so tools stop assuming a cold start.
    prisma.jobPostingApplication.count({
      where: { studentId: userId, status: { in: [...OPEN_APPLICATION_STATUSES] } },
    }).catch(() => 0),
    prisma.jobPostingApplication.findMany({
      where: { studentId: userId },
      orderBy: { appliedAt: 'desc' },
      take: 5,
      select: { status: true },
    }).catch(() => [] as Array<{ status: string }>),
    prisma.aIJobMatch.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { job: { select: { title: true } } },
    }).catch(() => [] as Array<{ job: { title: string } | null }>),
    // At-risk tier — reuse the counselor queue's score thresholds, don't recompute the score.
    prisma.atRiskAlert.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { score: true },
    }).catch(() => null as { score: number } | null),
    // Memory unification (one-way): read the voice coach's rolling summary so
    // text tools stop starting cold on members who've talked to the voice
    // coach. Single findUnique, fail-soft to null — never blocks context load.
    prisma.coachMemory.findUnique({
      where: { userId },
      select: { summary: true, lastTopic: true },
    }).catch(() => null as { summary: string; lastTopic: string | null } | null),
  ]);

  // Prefer career rec → most recent resume_rewriter output → null.
  let targetRole = state.inferredTargetRole;
  if (!targetRole) {
    const lastRewrite = recentRows.find((r) => r.toolType === 'resume_rewriter');
    if (lastRewrite?.inputSummary) {
      // Tool summary usually looks like "Senior PM — Acme" — first segment is
      // the role they targeted last time.
      const firstSegment = lastRewrite.inputSummary.split(/[—\-]/)[0]?.trim();
      if (firstSegment && firstSegment.length > 1) {
        targetRole = firstSegment;
      }
    }
  }

  const inferredExperienceLevel = inferExperienceLevel(state);

  // Resume context: file-derived first, falls back to empty (callers should
  // treat empty as "no resume" and prompt accordingly).
  const resumeContext = (resumeText ?? '').slice(0, resumeBudget);

  const barrierTypes = personalRow?.profile?.barrierTypes ?? [];
  const barriers = {
    hasEmploymentBarrier: personalRow?.profile?.hasEmploymentBarrier ?? false,
    barrierTypes,
  };

  const recommendedCareers = (state.careerRecommendation?.topOccupations ?? [])
    .slice(0, 3)
    .map((o) => o.title)
    .filter((t): t is string => Boolean(t && t.trim().length > 0));

  const assessmentSummary = summarizeAssessmentAnswers(personalRow?.assessmentAnswers ?? null);

  const jobPipeline = {
    openApplicationCount,
    recentApplicationStatuses: recentApplicationRows.map((r) => r.status),
    recentMatchTitles: recentMatchRows
      .map((m) => m.job?.title)
      .filter((t): t is string => Boolean(t && t.trim().length > 0)),
  };

  const atRiskTier = latestAlert ? getRiskLevel(latestAlert.score) : null;

  const coachMemorySummary = coachMemoryRow?.summary?.trim();
  const coachMemory = coachMemorySummary
    ? {
        summary: coachMemorySummary.slice(0, COACH_MEMORY_SUMMARY_MAX_CHARS),
        lastTopic: coachMemoryRow?.lastTopic?.trim() || null,
      }
    : null;

  const activeGoals = goalRows.map((g) => ({
    title: g.title,
    goalType: g.goalType,
    progress:
      g.targetMetricValue != null && g.targetMetricValue > 0
        ? `${g.currentMetricValue}/${g.targetMetricValue}`
        : null,
  }));

  return {
    member: {
      fullName: state.fullName ?? state.email.split('@')[0] ?? 'there',
      targetRole,
      inferredExperienceLevel,
      programInterest: state.programName ?? state.enrolledProgram,
    },
    recentToolResults: recentRows.map((r) => ({
      toolType: r.toolType,
      summary: r.inputSummary,
      createdAt: r.createdAt,
      parentToolResultId: r.parentToolResultId,
    })),
    resumeContext,
    hasResume: state.hasResume,
    hasCompletedInterviewPractice:
      state.hasCompletedInterviewPractice ||
      recentRows.some((r) => r.toolType === 'interview_practice'),
    barriers,
    recommendedCareers,
    assessmentSummary,
    activeGoals,
    jobPipeline,
    atRiskTier,
    coachMemory,
  };
}

/**
 * Turn the free-form `assessmentAnswers` JSON into a short, model-friendly
 * snippet. We keep it terse and resilient — the shape varies across assessment
 * versions, so we only surface obviously-useful string/array/number answers.
 */
function summarizeAssessmentAnswers(answers: unknown): string | null {
  if (!answers || typeof answers !== 'object') return null;

  const entries = Object.entries(answers as Record<string, unknown>);
  const parts: string[] = [];

  for (const [key, value] of entries) {
    if (parts.length >= 6) break;
    const label = key.replace(/[_-]+/g, ' ').trim();
    if (!label) continue;

    let rendered: string | null = null;
    if (typeof value === 'string' && value.trim()) {
      rendered = value.trim().slice(0, 80);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      rendered = String(value);
    } else if (Array.isArray(value)) {
      const flat = value
        .filter((v) => typeof v === 'string' || typeof v === 'number')
        .map((v) => String(v))
        .slice(0, 5);
      if (flat.length) rendered = flat.join(', ').slice(0, 120);
    }

    if (rendered) parts.push(`${label}: ${rendered}`);
  }

  return parts.length ? parts.join('; ') : null;
}

/**
 * Render the context into a short "What we learned about you" block that
 * tools can append to their system prompt.
 *
 * Keep this terse — the goal is to give the model just enough context to
 * stop asking the same question twice. We do NOT dump full output here.
 */
export function renderCoachContextForPrompt(ctx: AICoachContext): string {
  const lines: string[] = ['What we already know about this candidate (do not ask them to repeat this):'];

  lines.push(`- Name: ${ctx.member.fullName}`);
  if (ctx.member.targetRole) {
    lines.push(`- Target role: ${ctx.member.targetRole}`);
  }
  lines.push(`- Experience level: ${ctx.member.inferredExperienceLevel}`);
  if (ctx.member.programInterest) {
    lines.push(`- Active program: ${ctx.member.programInterest}`);
  }
  if (ctx.hasResume) {
    lines.push('- Has a resume on file');
  }
  if (ctx.hasCompletedInterviewPractice) {
    lines.push('- Has practiced interview questions before — you can reference prior practice naturally');
  }

  if (ctx.recommendedCareers.length > 0) {
    lines.push(`- Career assessment points toward: ${ctx.recommendedCareers.join(', ')} — align suggestions with these where it fits`);
  }

  if (ctx.assessmentSummary) {
    lines.push(`- From their career assessment: ${ctx.assessmentSummary}`);
  }

  if (ctx.activeGoals.length > 0) {
    const goalLabels = ctx.activeGoals
      .slice(0, 3)
      .map((g) => (g.progress ? `${g.title} (${g.progress})` : g.title))
      .join('; ');
    lines.push(`- Working toward these goals right now: ${goalLabels} — connect your help to their goals when you can`);
  }

  if (ctx.barriers.hasEmploymentBarrier || ctx.barriers.barrierTypes.length > 0) {
    const niceBarriers = ctx.barriers.barrierTypes
      .map(humanLabelForBarrier)
      .filter((b) => b.length > 0);
    if (niceBarriers.length > 0) {
      lines.push(
        `- This member faces real barriers to employment (${niceBarriers.join(', ')}). Be warm, encouraging, and practical. Never be condescending; meet them where they are, acknowledge the extra effort their situation takes, and keep advice concrete and achievable.`
      );
    } else {
      lines.push(
        '- This member has self-reported a barrier to employment. Be warm, encouraging, and practical; keep advice concrete and achievable.'
      );
    }
  }

  if (ctx.recentToolResults.length > 0) {
    const recentLabels = ctx.recentToolResults
      .slice(0, 3)
      .map((r) => `${humanLabelForToolType(r.toolType)} (${r.summary.slice(0, 40)})`)
      .join('; ');
    lines.push(`- Recent AI work: ${recentLabels}`);
  }

  if (ctx.jobPipeline.openApplicationCount > 0) {
    lines.push(
      `- Has ${ctx.jobPipeline.openApplicationCount} open job application(s) in progress (${ctx.jobPipeline.recentApplicationStatuses.slice(0, 5).join(', ')}) — don't treat them as if they haven't started applying yet.`
    );
  }
  if (ctx.jobPipeline.recentMatchTitles.length > 0) {
    lines.push(`- AI has recently surfaced these job matches for them: ${ctx.jobPipeline.recentMatchTitles.join(', ')}.`);
  }

  if (ctx.atRiskTier === 'CRITICAL' || ctx.atRiskTier === 'HIGH') {
    lines.push(
      `- This member is flagged ${ctx.atRiskTier.toLowerCase()} risk of disengaging — be extra encouraging, keep next steps small and concrete, and end with one clear action.`
    );
  }

  if (ctx.coachMemory?.summary) {
    const topicSuffix = ctx.coachMemory.lastTopic ? ` (last topic: ${ctx.coachMemory.lastTopic})` : '';
    lines.push(`- Coach notes: ${ctx.coachMemory.summary}${topicSuffix}`);
  }

  return lines.join('\n');
}

function humanLabelForToolType(toolType: string): string {
  switch (toolType) {
    case 'resume_rewriter': return 'resume rewrite';
    case 'resume_analysis': return 'resume analysis';
    case 'cover_letter': return 'cover letter';
    case 'interview_practice': return 'interview practice';
    case 'linkedin_about': return 'LinkedIn About';
    case 'linkedin_headline': return 'LinkedIn headline';
    case 'job_match_scorer': return 'job match score';
    case 'salary_negotiation': return 'salary negotiation';
    case 'gap_analyzer': return 'skills gap analysis';
    case 'skill_mapper': return 'skill mapping';
    case 'elevator_pitch': return 'elevator pitch';
    default: return toolType.replace(/_/g, ' ');
  }
}

/**
 * Map a stored barrier value (see DashboardProfileForm BARRIER_OPTIONS) to a
 * short, dignity-preserving phrase for the AI prompt. Falls back to a cleaned
 * version of the raw value so future barrier types degrade gracefully.
 */
function humanLabelForBarrier(value: string): string {
  switch (value) {
    case 'justice_involved': return 'a justice-involved background';
    case 'employment_gap': return 'a significant gap in their work history';
    case 'limited_work_history': return 'limited or no prior work history';
    case 'disability': return 'a disability that affects employment';
    case 'housing_instability': return 'housing instability';
    case 'domestic_violence': return 'a domestic violence situation';
    case 'homelessness': return 'experiencing homelessness';
    case 'substance_recovery': return 'being in substance recovery';
    case 'other': return 'another personal barrier to employment';
    default: return value.replace(/_/g, ' ').trim();
  }
}

function inferExperienceLevel(
  state: Awaited<ReturnType<typeof getMemberState>>
): 'entry' | 'mid' | 'senior' {
  const { employmentStatus, educationLevel } = state.profile ?? { employmentStatus: null, educationLevel: null };

  if (
    employmentStatus?.includes('senior') ||
    employmentStatus?.includes('manager') ||
    employmentStatus?.includes('lead')
  ) {
    return 'senior';
  }

  if (
    employmentStatus?.includes('student') ||
    employmentStatus?.includes('intern') ||
    employmentStatus?.includes('first') ||
    educationLevel?.includes('high school') ||
    !state.hasResume
  ) {
    return 'entry';
  }

  return 'mid';
}
