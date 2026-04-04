import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';

const FILE_RESUME_MAX = 6000;
const LIVE_DRAFT_MAX = 6000;
/** Align with `getMemberResumePlainText` (substantive extract). Below this, treat as no usable resume text for voice branching. */
const MIN_USABLE_RESUME_CHARS = 40;

async function getResumeCoachDynamicVariables(
  userId: string,
  opts: { liveResumeDraft?: string }
): Promise<Record<string, string>> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!dbUser) {
      return {};
    }

    const program = dbUser.enrolledProgram ? getProgramBySlug(dbUser.enrolledProgram) : null;
    const fileResume = (await getMemberResumePlainText(userId, FILE_RESUME_MAX)) ?? '';
    const draft = opts.liveResumeDraft?.trim() ?? '';

    const resumeFileOnProfile = !!(
      dbUser.profile?.resumeOriginalPath || dbUser.profile?.resumeEnhancedPath
    );

    const hasUsableFileText = fileResume.trim().length >= MIN_USABLE_RESUME_CHARS;
    const hasUsableDraft = draft.length >= MIN_USABLE_RESUME_CHARS;
    const hasUsableResume = hasUsableFileText || hasUsableDraft;

    return {
      member_name: dbUser.fullName ?? '',
      program_title: program?.title ?? '',
      program_skills: program?.skills?.join(', ') ?? '',
      resume_text: fileResume.slice(0, FILE_RESUME_MAX),
      live_resume_draft: draft.slice(0, LIVE_DRAFT_MAX),
      /** True only when we have substantive extracted file text and/or a substantive live draft (voice start snapshot). */
      has_resume: hasUsableResume ? 'true' : 'false',
      /** True when a file path exists on profile (even if extraction failed or text is short). For agent: uploaded but unreadable vs no upload. */
      resume_file_on_profile: resumeFileOnProfile ? 'true' : 'false',
    };
  } catch (err) {
    console.error('[resume-coach] context fetch error:', err);
    return {};
  }
}


/**
 * POST — signed URL for resume-focused voice coach.
 * Body (optional): `{ liveResumeDraft?: string }` — snapshot from the live editor at session start.
 * Dynamic variables: `resume_text`, `live_resume_draft`, `has_resume` (usable text/draft ≥40 chars),
 * `resume_file_on_profile` (stored path exists), plus member/program fields.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let liveResumeDraft = '';
  try {
    const body = (await req.json()) as { liveResumeDraft?: unknown };
    if (typeof body?.liveResumeDraft === 'string') {
      liveResumeDraft = body.liveResumeDraft;
    }
  } catch {
    /* empty body */
  }

  try {
    const dynamicVariables = await getResumeCoachDynamicVariables(user.id, { liveResumeDraft });
    const { signedUrl, expiresAt } = await startElevenLabsPortalSession('resume_coach', {
      dynamicVariables,
    });
    return NextResponse.json({ signedUrl, expiresAt, dynamicVariables });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[member/resume-coach/session]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
