import { getMemberState } from '@/lib/member/getMemberState';
import { prisma } from '@/lib/db/prisma';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';
import type { ResumeFramework } from '@/lib/resume/inferResumeFramework';

/**
 * Prefill data for AI tools — reads from member state, never invents.
 * 
 * Resume source of truth (in order):
 *  1. Supabase file (profile.resumeOriginalPath / resumeEnhancedPath)
 *  2. AIToolResult type='resume_analysis' fallback
 *  3. null → honest error
 * 
 * Career recommendation source of truth:
 *  - Only from "Find Your Path" quiz (careerRecommendationJson on User)
 *  - Training preassessment does NOT produce this
 *  Fallback chain: careerRec.topOccupations[0].title → programInterest → enrolledProgram title
 */

export type ElevatorPitchPrefill = {
  name: string;
  targetRole: string;
  strengths: string;
  certifications: string;
  industry: string;
};

export type ResumeRewriterPrefill =
  | { ok: true; resume: string; jobTarget: string | null; framework: ResumeFramework | 'auto' }
  | { ok: false; error: string };

export type InterviewPracticePrefill = {
  role: string;
  experienceLevel: 'entry' | 'mid' | 'senior';
  resumeContext: string;
};

// ─── Elevator Pitch ──────────────────────────────────────────────────────────

export async function prefillElevatorPitch(userId: string): Promise<ElevatorPitchPrefill> {
  const state = await getMemberState(userId);

  const name = state.fullName ?? state.email.split('@')[0];
  const targetRole = state.inferredTargetRole ?? 'your target role';

  // Strengths: career rec top skills → training completed slugs → empty
  const strengths =
    state.careerRecommendation?.topOccupations?.[0]?.skills?.join(', ') ??
    state.trainingView?.completedSlugsAuthoritative?.join(', ') ??
    '';

  // Certifications: training completions
  const certifications = state.trainingView?.completedSlugsAuthoritative?.join(', ') ?? '';

  // Industry: career rec → generic
  const industry = state.careerRecommendation?.topOccupations?.[0]?.description?.split('.')[0] ?? '';

  return { name, targetRole, strengths, certifications, industry };
}

// ─── Resume Rewriter ───────────────────────────────────────────────────────────

export async function prefillResumeRewriter(userId: string): Promise<ResumeRewriterPrefill> {
  // 1. Supabase file (original first — we want the source-of-truth resume for rewriting)
  const fromFile = await getMemberResumePlainText(userId, 12000, { preferOriginal: true });
  if (fromFile && fromFile.trim().length > 40) {
    const state = await getMemberState(userId);
    return {
      ok: true,
      resume: fromFile.trim(),
      jobTarget: state.inferredTargetRole,
      framework: 'auto',
    };
  }

  // 2. AIToolResult fallback
  const aiResult = await prisma.aIToolResult.findFirst({
    where: { userId, toolType: 'resume_analysis' },
    orderBy: { createdAt: 'desc' },
    select: { output: true },
  });
  if (aiResult?.output && aiResult.output.trim().length > 40) {
    const state = await getMemberState(userId);
    return {
      ok: true,
      resume: aiResult.output.trim().slice(0, 12000),
      jobTarget: state.inferredTargetRole,
      framework: 'auto',
    };
  }

  // 3. Honest failure — no resume exists
  return {
    ok: false,
    error: 'No resume on file. Upload or paste your resume first at /dashboard/resume.',
  };
}

// ─── Interview Practice ──────────────────────────────────────────────────────

export async function prefillInterviewPractice(userId: string): Promise<InterviewPracticePrefill> {
  const state = await getMemberState(userId);

  const role = state.inferredTargetRole ?? 'your target role';

  // Experience level from profile employment status
  const experienceLevel = inferExperienceLevel(state);

  // Resume context: Supabase file first, then AIToolResult
  const resumeContext = await getMemberResumePlainText(userId, 6000, { preferOriginal: false })
    ?? await prisma.aIToolResult.findFirst({
        where: { userId, toolType: 'resume_analysis' },
        orderBy: { createdAt: 'desc' },
        select: { output: true },
      }).then(r => r?.output ?? '');

  return { role, experienceLevel, resumeContext: resumeContext.slice(0, 6000) };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inferExperienceLevel(state: Awaited<ReturnType<typeof getMemberState>>): 'entry' | 'mid' | 'senior' {
  const { employmentStatus, educationLevel } = state.profile ?? {} as any;

  // Senior indicators
  if (employmentStatus?.includes('senior') || employmentStatus?.includes('manager') || employmentStatus?.includes('lead')) {
    return 'senior';
  }

  // Entry indicators
  if (
    employmentStatus?.includes('student') ||
    employmentStatus?.includes('intern') ||
    employmentStatus?.includes('first') ||
    educationLevel?.includes('high school') ||
    !state.hasResume
  ) {
    return 'entry';
  }

  // Default mid for anyone with a resume and some experience
  return 'mid';
}

// ─── Honest-error helper for routes ──────────────────────────────────────────

export function honestNoResumeError(): { error: string; status: number } {
  return {
    error: 'We need a resume to tailor this for you. Upload one at /dashboard/resume, then come back.',
    status: 400,
  };
}
