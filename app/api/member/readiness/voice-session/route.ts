import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { hasActiveVoiceSessionUser, VOICE_SESSION_IDENTITY_MESSAGE, VOICE_SESSION_RESPONSE_HEADERS, VOICE_SESSION_UNAVAILABLE_MESSAGE } from '@/lib/ai/voiceSessionBoundary';
import { VOICE_SESSION_LIMIT_MESSAGE, checkVoiceSessionRateLimit } from '@/lib/rate-limit';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { fetchMemberPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';
import { trackEvent } from '@/lib/events/track';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const POST = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      const { signedUrl, expiresAt, dynamicVariables: returned } = await startElevenLabsPortalSession('readiness', {
        dynamicVariables,
      });
      return NextResponse.json({
        signedUrl,
        expiresAt,
        dynamicVariables: returned ?? dynamicVariables,
      }, { headers: VOICE_SESSION_RESPONSE_HEADERS });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start session';
      console.error('[member/readiness/voice-session]', msg);
      return NextResponse.json({ error: VOICE_SESSION_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
  } catch (error) {
    console.error('/member/readiness/voice-session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
