import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { ElevenLabsApiError } from '@/lib/ai/elevenlabs';
import { startMemberAgentGatewaySession } from '@/lib/agents/gateway/startMemberSession';
import { getGucContext } from '@/lib/db/gucContext';
import type { ElevenLabsAgentKey } from '@/lib/elevenlabs/agentRegistry';

/** Member-facing copy for a voice coach that could not be started at all. */
export const MEMBER_VOICE_UNAVAILABLE_MESSAGE =
  'Voice coaching is unavailable right now. Please try again in a few minutes, or message your counselor if it keeps happening.';

export type MemberVoiceSessionResult = {
  signedUrl: string;
  expiresAt?: string;
  conversationId?: string;
  dynamicVariables: Record<string, string>;
  /**
   * `primary` when the requested agent answered; `lilley_fallback` when the
   * requested agent is unknown to the live ElevenLabs account (404) and the
   * session was started on Lilley, the reviewed member career coach, through
   * the governed member gateway instead.
   */
  agent: 'primary' | 'lilley_fallback';
};

/**
 * Start a member voice coach, and keep the member talking to *someone* when
 * the dedicated agent is gone.
 *
 * Background (9/2–9/5/26): the April 2026 ElevenLabs account migration left
 * several reviewed agent ids (WIOA guide, interview coach, …) unknown to the
 * live account, so `get-signed-url` answers 404 and members saw
 * "Server: ElevenLabs Conversational API error (404)". The only agent verified
 * working in production is Lilley, reached through the member gateway. On a
 * 404 we start Lilley instead and tell the caller (`agent: 'lilley_fallback'`)
 * so the UI can say so. Any other failure is rethrown untouched.
 *
 * Setting the role's `ELEVENLABS_*_AGENT_ID` to a live agent restores the
 * dedicated coach with no code change.
 */
export async function startMemberVoiceSessionWithLilleyFallback(input: {
  key: ElevenLabsAgentKey;
  userId: string;
  dynamicVariables?: Record<string, string>;
  /** Route label for the server log, e.g. `member/readiness/voice-session`. */
  routeLabel: string;
}): Promise<MemberVoiceSessionResult> {
  try {
    const primary = await startElevenLabsPortalSession(input.key, {
      dynamicVariables: input.dynamicVariables,
    });
    return {
      signedUrl: primary.signedUrl,
      ...(primary.expiresAt ? { expiresAt: primary.expiresAt } : {}),
      ...(primary.conversationId ? { conversationId: primary.conversationId } : {}),
      // Only the provider-boundary-clamped set is returned; never echo the raw
      // input variables to the browser.
      dynamicVariables: primary.dynamicVariables ?? {},
      agent: 'primary',
    };
  } catch (primaryError) {
    if (!(primaryError instanceof ElevenLabsApiError && primaryError.status === 404)) {
      throw primaryError;
    }

    // The gateway binds Lilley's read-only tools to the signed-in member, so
    // it needs a real member request context. Without one, surface the
    // original provider failure rather than guess.
    const guc = getGucContext();
    if (
      !guc ||
      !guc.orgId ||
      guc.userId !== input.userId ||
      guc.role === 'anonymous' ||
      guc.role === 'system'
    ) {
      throw primaryError;
    }

    console.warn(
      `[${input.routeLabel}] ElevenLabs agent for "${input.key}" returned 404; starting Lilley through the member gateway instead. Set the role's agent id env var to a live agent to restore the dedicated coach.`,
    );

    const fallback = await startMemberAgentGatewaySession({
      userId: input.userId,
      organizationId: guc.orgId,
      role: guc.role,
      agentKey: 'career_business',
    });
    return {
      signedUrl: fallback.signedUrl,
      ...(fallback.expiresAt ? { expiresAt: fallback.expiresAt } : {}),
      ...(fallback.conversationId ? { conversationId: fallback.conversationId } : {}),
      dynamicVariables: fallback.dynamicVariables,
      agent: 'lilley_fallback',
    };
  }
}
