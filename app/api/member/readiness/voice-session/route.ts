import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { fetchMemberPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';
import { trackEvent } from '@/lib/events/track';

/** POST — signed URL for career readiness voice coach. */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[member/readiness/voice-session]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
