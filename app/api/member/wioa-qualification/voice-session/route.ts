import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { fetchWioaPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';

/** POST — signed URL for WIOA pre-qualification voice guide. */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
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
}
