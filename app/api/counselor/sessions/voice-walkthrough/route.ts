import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';
import { captureApiError } from '@/lib/observability/captureApiError';

/**
 * In-Office Session voice walk-through endpoint.
 *
 * Per user direction (2026-04-26): "we want these to be all voice tools
 * here." This mints an ElevenLabs ConvAI signed URL using the existing
 * resume_coach agent (multi-purpose: profile + resume + cover letter
 * scaffolding) with subject-member dynamic variables so the agent knows
 * who they're working with. Counselor + member sit together; the agent
 * walks them through resume + cover letter + interview prep in one
 * voice conversation.
 *
 * After the session ends, the client captures the transcript and pre-fills
 * the SessionRunClient typing forms — counselor reviews, runs the existing
 * AI tool routes (resume-rewriter, cover-letter, interview-practice) with
 * voice-captured inputs.
 */
const bodySchema = z.object({
  memberId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
        { status: 400 },
      );
    }
    const { memberId, sessionId } = parsed.data;

    const onBehalf = await resolveActOnBehalf(user.id, memberId);
    if (!onBehalf.ok) {
      return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
    }

    const member = await prisma.user.findUnique({
      where: { id: memberId },
      select: { fullName: true, email: true, programInterest: true, enrolledProgram: true },
    });
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    // Best-effort: pull existing resume to seed the agent's context. If
    // the member is a brand-new walk-in, this is empty and the agent
    // walks them through profile-building from scratch.
    const existingResume = await getMemberResumePlainText(memberId, 4000, { preferOriginal: true });

    const dynamicVariables: Record<string, string> = {
      member_first_name: member.fullName?.split(' ')[0] ?? 'the member',
      member_full_name: member.fullName ?? member.email,
      target_role: member.programInterest ?? member.enrolledProgram ?? '',
      session_id: sessionId,
      actor_name: onBehalf.actorName ?? 'the counselor',
      has_resume: existingResume ? 'true' : 'false',
      resume_text: existingResume,
      walkthrough_phase: 'profile-resume-cover-interview',
    };

    const session = await startElevenLabsPortalSession('resume_coach', {
      dynamicVariables,
    });

    return NextResponse.json({
      signedUrl: session.signedUrl,
      expiresAt: session.expiresAt,
      dynamicVariables: session.dynamicVariables ?? dynamicVariables,
    });
  } catch (error) {
    captureApiError(error, { route: 'POST /api/counselor/sessions/voice-walkthrough' });
    const msg = error instanceof Error ? error.message : 'Failed to start voice walk-through';
    return NextResponse.json(
      { error: msg.includes('ElevenLabs') || msg.includes('agent') ? 'Voice sessions are not configured' : 'Failed to start session' },
      { status: 503 },
    );
  }
}
