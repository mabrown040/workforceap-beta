import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { hasActiveVoiceSessionUser, VOICE_SESSION_IDENTITY_MESSAGE, VOICE_SESSION_RESPONSE_HEADERS } from '@/lib/ai/voiceSessionBoundary';
import { VOICE_SESSION_LIMIT_MESSAGE, checkVoiceSessionRateLimit } from '@/lib/rate-limit';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getSubjectOrganizationId } from '@/lib/tenant/organization';
// `prisma` import removed: the only direct use was the `member` lookup,
// which now runs inside `withTenantScope`.
import {
  startElevenLabsPortalSession,
  type ElevenLabsPortalAgentKey,
} from '@/lib/ai/elevenlabsAgents';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';
import { captureApiError } from '@/lib/observability/captureApiError';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 5).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * The member lookup is wrapped in `withTenantScope` so a counselor from
 * Org A cannot resolve an Org B member's name/email/program into a
 * voice-agent dynamic-variables payload by guessing the UUID. The
 * `resolveActOnBehalf` check above gates the assignment relationship,
 * but it does not enforce tenancy — this lookup does.
 */

/**
 * In-Office Session voice walk-through endpoint.
 *
 * Per user direction (2026-04-26): "we want these to be all voice tools
 * here." Per follow-up (2026-04-27): "each step is separate card. filling
 * out as you go along. and all feeding to each other right." So this
 * endpoint mints a ConvAI signed URL targeting the right agent for the
 * card the counselor is on, with the *prior* card's outputs threaded in
 * as dynamic variables so the agent picks up where the last one left off.
 *
 * Card → agent map:
 *   walkthrough → resume_coach   (full A→Z conversation, original behavior)
 *   resume      → resume_coach   (focused on framing experience for target role)
 *   cover       → resume_coach   (cover-letter framing — no dedicated agent yet)
 *   interview   → interview      (mock interview / prep questions)
 */
type CardKey = 'walkthrough' | 'resume' | 'cover' | 'interview';

const CARD_TO_AGENT: Record<CardKey, ElevenLabsPortalAgentKey> = {
  walkthrough: 'resume_coach',
  resume: 'resume_coach',
  cover: 'resume_coach',
  interview: 'interview',
};

const CARD_PHASE: Record<CardKey, string> = {
  walkthrough: 'profile-resume-cover-interview',
  resume: 'resume-only',
  cover: 'cover-letter',
  interview: 'interview-prep',
};

const bodySchema = z.object({
  memberId: z.string().uuid(),
  sessionId: z.string().uuid(),
  card: z.enum(['walkthrough', 'resume', 'cover', 'interview']).optional().default('walkthrough'),
  // Prior-step outputs threaded forward so the next agent has full context.
  resumeDraft: z.string().max(8000).optional(),
  coverDraft: z.string().max(8000).optional(),
  jobTarget: z.string().max(200).optional(),
  jobDescription: z.string().max(8000).optional(),
  companyName: z.string().max(200).optional(),
  interviewLevel: z.enum(['entry', 'mid', 'senior']).optional(),
});

async function _POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await hasActiveVoiceSessionUser(user.id))) {
      return NextResponse.json({ error: VOICE_SESSION_IDENTITY_MESSAGE }, { status: 403 });
    }

    const { success: voiceRateOk } = await checkVoiceSessionRateLimit(user.id);
    if (!voiceRateOk) {
      return NextResponse.json(
        { error: VOICE_SESSION_LIMIT_MESSAGE },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
        { status: 400 },
      );
    }
    const {
      memberId,
      sessionId,
      card,
      resumeDraft,
      coverDraft,
      jobTarget: jobTargetInput,
      jobDescription,
      companyName,
      interviewLevel,
    } = parsed.data;

    const onBehalf = await resolveActOnBehalf(user.id, memberId);
    if (!onBehalf.ok) {
      return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
    }

    // Use the subject member's org as the scope. `resolveActOnBehalf` above
    // verified the actor's authority over this member (super_admin / admin
    // platform-wide, or counselor with active assignment). Codex P2 catch on
    // PR #1051 — using `getActorOrganizationId(user.id)` here broke
    // super_admin cross-tenant sessions because the scoped lookup returned
    // "Member not found" when the super_admin's own org didn't match the
    // member's org.
    const orgId = await getSubjectOrganizationId(memberId);
    const member = await withTenantScope(orgId, (db) =>
      db.user.findFirst({
        where: { id: memberId, deletedAt: null },
        select: { fullName: true, email: true, programInterest: true, enrolledProgram: true },
      }),
    );
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    // Best-effort: pull existing resume to seed the agent's context. If
    // the member is a brand-new walk-in, this is empty and the agent
    // walks them through profile-building from scratch. Caller can also
    // pass resumeDraft (e.g. transcript-pre-fill) which takes precedence.
    const existingResume = await getMemberResumePlainText(memberId, 4000, { preferOriginal: true });
    const resumeContext = (resumeDraft && resumeDraft.trim().length > 50)
      ? resumeDraft
      : existingResume;
    const targetRole = jobTargetInput?.trim()
      || member.programInterest
      || member.enrolledProgram
      || '';

    const dynamicVariables: Record<string, string> = {
      member_first_name: member.fullName?.split(' ')[0] ?? 'the member',
      member_full_name: member.fullName ?? member.email,
      target_role: targetRole,
      session_id: sessionId,
      actor_name: onBehalf.actorName ?? 'the counselor',
      has_resume: resumeContext ? 'true' : 'false',
      resume_text: resumeContext,
      walkthrough_phase: CARD_PHASE[card],
      card,
    };

    if (card === 'cover') {
      dynamicVariables.company_name = companyName ?? '';
      dynamicVariables.job_description = jobDescription ?? '';
      dynamicVariables.cover_draft = coverDraft ?? '';
    }
    if (card === 'interview') {
      dynamicVariables.interview_level = interviewLevel ?? 'entry';
      dynamicVariables.cover_draft = coverDraft ?? '';
    }

    const session = await startElevenLabsPortalSession(CARD_TO_AGENT[card], {
      dynamicVariables,
    });

    return NextResponse.json({
      signedUrl: session.signedUrl,
      expiresAt: session.expiresAt,
      dynamicVariables: session.dynamicVariables ?? dynamicVariables,
    }, { headers: VOICE_SESSION_RESPONSE_HEADERS });
  } catch (error) {
    captureApiError(error, { route: 'POST /api/counselor/sessions/voice-walkthrough' });
    const msg = error instanceof Error ? error.message : 'Failed to start voice walk-through';
    return NextResponse.json(
      { error: msg.includes('ElevenLabs') || msg.includes('agent') ? 'Voice sessions are not configured' : 'Failed to start session' },
      { status: 503 },
    );
  }
}
export const POST = withApiGuc(_POST);
