import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { VOICE_SESSION_LIMIT_MESSAGE, checkVoiceSessionRateLimit } from '@/lib/rate-limit';
import { startMemberVoiceSessionWithLilleyFallback } from '@/lib/ai/memberVoiceFallback';
import { fetchWioaPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';
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
        metadata: { tool: 'wioa_prequalification_voice_session', provider: 'elevenlabs' },
        sourcePage: '/dashboard/learning/wioa-qualification',
      }).catch(() => {});

      const dynamicVariables = await fetchWioaPortalDynamicVariables(user.id);
      // 9/3/26: the WIOA pre-qualification agent ids on record are unknown to
      // the live ElevenLabs account (404 on both). Rather than show members an
      // error, the helper runs the practice conversation on Lilley, the member
      // career coach that is verified working, through the governed gateway
      // (member context arrives via tools, not prompt variables). Setting
      // ELEVENLABS_WIOA_PREQUAL_AGENT_ID to a live agent restores the dedicated
      // WIOA guide without a code change.
      const session = await startMemberVoiceSessionWithLilleyFallback({
        key: 'wioa_prequal',
        userId: user.id,
        dynamicVariables,
        routeLabel: 'member/wioa-qualification/voice-session',
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
      const msg = e instanceof Error ? e.message : 'Failed to start session';
      // Keep the provider detail (status code, env var hint) in the server log;
      // members only need to know the written screening still works.
      console.error('[member/wioa-qualification/voice-session]', msg);
      return NextResponse.json(
        {
          error:
            'Voice practice is unavailable right now. The written screening on this page still works — please use that for now.',
        },
        { status: 503 },
      );
    }
  } catch (error) {
    console.error('/member/wioa-qualification/voice-session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
