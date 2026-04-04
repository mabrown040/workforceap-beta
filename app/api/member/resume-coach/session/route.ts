import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';

const FILE_RESUME_MAX = 6000;
const LIVE_DRAFT_MAX = 6000;

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
    const fileResume = await getMemberResumePlainText(userId, FILE_RESUME_MAX);
    const draft = opts.liveResumeDraft?.trim();

    const hasPersistedResume = !!(
      dbUser.profile?.resumeOriginalPath || dbUser.profile?.resumeEnhancedPath
    );

    return {
      member_name: dbUser.fullName ?? '',
      program_title: program?.title ?? '',
      program_skills: program?.skills?.join(', ') ?? '',
      resume_text: fileResume ?? '',
      live_resume_draft: draft?.slice(0, LIVE_DRAFT_MAX) ?? '',
      has_resume: hasPersistedResume ? 'true' : 'false',
    };
  } catch (err) {
    console.error('[resume-coach] context fetch error:', err);
    return {};
  }
}


/** POST — signed URL for resume-focused voice coach. Body (optional): `{ liveResumeDraft?: string }` from the live editor. */
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
