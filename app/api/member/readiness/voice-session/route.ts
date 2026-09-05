import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { VOICE_SESSION_LIMIT_MESSAGE, checkVoiceSessionRateLimit } from '@/lib/rate-limit';
import {
  MEMBER_VOICE_UNAVAILABLE_MESSAGE,
  startMemberVoiceSessionWithLilleyFallback,
} from '@/lib/ai/memberVoiceFallback';
import { fetchMemberPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';
import { trackEvent } from '@/lib/events/track';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const POST = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { success: voiceRateOk } = await checkVoiceSessionRateLimit(user.id);
    if (!voiceRateOk) {
      return NextResponse.json(
        { error: VOICE_SESSION_LIMIT_MESSAGE },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }

    try {
      void trackEvent({
        userId: user.id,
        eventName: 'ai_tool_run_started',
        entityType: 'ai_tool',
        metadata: { tool: 'readiness_voice_session', provider: 'elevenlabs' },
        sourcePage: '/dashboard/readiness',
      }).catch(() => {});

      const memberDynamicVariables = await fetchMemberPortalDynamicVariables(user.id);
      const { member_name: _memberName, ...dynamicVariables } = memberDynamicVariables;
      const session = await startMemberVoiceSessionWithLilleyFallback({
        key: 'readiness',
        userId: user.id,
        dynamicVariables,
        routeLabel: 'member/readiness/voice-session',
      });
      return NextResponse.json(
        {
          signedUrl: session.signedUrl,
          expiresAt: session.expiresAt,
          conversationId: session.conversationId,
          dynamicVariables: session.dynamicVariables,
          agent: session.agent,
        },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } },
      );
    } catch (e) {
      // Provider detail (status code, env var hint) stays in the server log;
      // the raw message used to reach members as "Server: ElevenLabs
      // Conversational API error (404)".
      const msg = e instanceof Error ? e.message : 'Failed to start session';
      console.error('[member/readiness/voice-session]', msg);
      return NextResponse.json({ error: MEMBER_VOICE_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
  } catch (error) {
    console.error('/member/readiness/voice-session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
