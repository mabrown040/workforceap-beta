import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { VOICE_SESSION_LIMIT_MESSAGE, checkVoiceSessionRateLimit } from '@/lib/rate-limit';
import { startMemberAgentGatewaySession } from '@/lib/agents/gateway/startMemberSession';
import { requireGucContext } from '@/lib/db/gucContext';
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
        metadata: { tool: 'career_business_voice_session', provider: 'elevenlabs' },
        sourcePage: '/dashboard/ai-tools/career-business-coach',
      }).catch(() => {});
  
      const guc = requireGucContext();
      if (
        !guc.orgId ||
        guc.userId !== user.id ||
        guc.role === 'anonymous' ||
        guc.role === 'system'
      ) {
        return NextResponse.json(
          { error: 'Your member identity could not be verified for this session.' },
          { status: 403 },
        );
      }
      const {
        signedUrl,
        expiresAt,
        conversationId,
        dynamicVariables: returned,
      } = await startMemberAgentGatewaySession({
        userId: user.id,
        organizationId: guc.orgId,
        role: guc.role,
        agentKey: 'career_business',
      });
      return NextResponse.json(
        {
          signedUrl,
          expiresAt,
          conversationId,
          dynamicVariables: returned,
        },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start session';
      console.error('[member/career-business-coach/voice-session]', msg);
      return NextResponse.json({ error: 'Voice sessions are not configured' }, { status: 503 });
    }
  } catch (error) {
    console.error('/member/career-business-coach/voice-session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
