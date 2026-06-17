import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkVoiceSessionRateLimit } from '@/lib/rate-limit';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
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
        { error: 'Too many voice sessions. Please wait an hour before starting another.' },
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
      const { signedUrl, expiresAt, dynamicVariables: returned } = await startElevenLabsPortalSession('wioa_prequal', {
        dynamicVariables,
      });
      return NextResponse.json({
        signedUrl,
        expiresAt,
        dynamicVariables: returned ?? dynamicVariables,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start session';
      console.error('[member/wioa-qualification/voice-session]', msg);
      return NextResponse.json({ error: msg }, { status: 503 });
    }
  } catch (error) {
    console.error('/member/wioa-qualification/voice-session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
