import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { fetchMemberPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';
import { trackEvent } from '@/lib/events/track';

/** POST — signed URL for career and business coach voice session. */
export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    try {
      void trackEvent({
        userId: user.id,
        eventName: 'ai_tool_run_started',
        entityType: 'ai_tool',
        metadata: { tool: 'career_business_voice_session', provider: 'elevenlabs' },
        sourcePage: '/dashboard/ai-tools/career-business-coach',
      }).catch(() => {});
  
      const memberDynamicVariables = await fetchMemberPortalDynamicVariables(user.id);
      const { member_name: _memberName, ...dynamicVariables } = memberDynamicVariables;
      const { signedUrl, expiresAt, dynamicVariables: returned } = await startElevenLabsPortalSession('career_business', {
        dynamicVariables,
      });
      return NextResponse.json({
        signedUrl,
        expiresAt,
        dynamicVariables: returned ?? dynamicVariables,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start session';
      console.error('[member/career-business-coach/voice-session]', msg);
      return NextResponse.json({ error: msg }, { status: 503 });
    }
  } catch (error) {
    console.error('/member/career-business-coach/voice-session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
