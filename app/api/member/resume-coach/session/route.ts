import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';

const FILE_RESUME_MAX = 6000;
const LIVE_DRAFT_MAX = 6000;

async function getResumeCoachDynamicContext(
  userId: string,
  opts: { liveResumeDraft?: string }
): Promise<string> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!dbUser) return '';

    const parts: string[] = [];

    parts.push(`Member: ${dbUser.fullName ?? 'Unknown'}`);
    const program = dbUser.enrolledProgram ? getProgramBySlug(dbUser.enrolledProgram) : null;
    if (program) {
      parts.push(`Program: ${program.title}`);
      if (program.skills?.length) parts.push(`Program skills: ${program.skills.join(', ')}`);
    }

    const fileResume = await getMemberResumePlainText(userId, FILE_RESUME_MAX);
    if (fileResume) {
      parts.push(`\n--- RESUME TEXT FROM UPLOADED FILE (enhanced or original) ---\n${fileResume}`);
    }

    const draft = opts.liveResumeDraft?.trim();
    if (draft) {
      parts.push(
        `\n--- LIVE EDITOR DRAFT (what the member sees on this page now; prefer this over the file excerpt if they conflict) ---\n${draft.slice(0, LIVE_DRAFT_MAX)}`
      );
    }

    if (parts.length <= 1 && !fileResume && !draft) {
      return '';
    }

    return [
      'You are coaching the following member on their resume. Reference their actual resume content when giving suggestions.',
      'When suggesting changes, be specific — quote the original phrase from their resume or draft and provide the improved version.',
      '',
      ...parts,
    ].join('\n');
  } catch (err) {
    console.error('[resume-coach] context fetch error:', err);
    return '';
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
    const dynamicContext = await getResumeCoachDynamicContext(user.id, { liveResumeDraft });
    const { signedUrl, expiresAt, dynamicContext: ctx } = await startElevenLabsPortalSession('resume_coach', {
      dynamicContext: dynamicContext || undefined,
    });
    return NextResponse.json({ signedUrl, expiresAt, dynamicContext: ctx });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[member/resume-coach/session]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
