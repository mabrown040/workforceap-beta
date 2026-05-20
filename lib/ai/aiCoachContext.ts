import { prisma } from '@/lib/db/prisma';
import { getMemberState } from '@/lib/member/getMemberState';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';

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

  const [state, resumeText, recentRows] = await Promise.all([
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
  };
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

  if (ctx.recentToolResults.length > 0) {
    const recentLabels = ctx.recentToolResults
      .slice(0, 3)
      .map((r) => `${humanLabelForToolType(r.toolType)} (${r.summary.slice(0, 40)})`)
      .join('; ');
    lines.push(`- Recent AI work: ${recentLabels}`);
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
