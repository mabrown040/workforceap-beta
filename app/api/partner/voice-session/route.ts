import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { fetchPartnerPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';
import { trackEvent } from '@/lib/events/track';

/** POST — signed URL for partner-facing voice assistant. Requires `ELEVENLABS_PARTNER_AGENT_ID`. */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) {
    return NextResponse.json({ error: 'Partner portal access required' }, { status: 403 });
  }

  try {
    void trackEvent({
      userId: user.id,
      eventName: 'ai_tool_run_started',
      entityType: 'ai_tool',
      metadata: { tool: 'partner_voice_session', provider: 'elevenlabs' },
      sourcePage: '/partner',
    }).catch(() => {});

    const dynamicVariables = await fetchPartnerPortalDynamicVariables(user.id);
    const { signedUrl, expiresAt, dynamicVariables: returned } = await startElevenLabsPortalSession('partner', {
      dynamicVariables,
    });
    return NextResponse.json({
      signedUrl,
      expiresAt,
      dynamicVariables: returned ?? dynamicVariables,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[partner/voice-session]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
