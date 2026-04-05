import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { fetchCounselorPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const dynamicVariables = await fetchCounselorPortalDynamicVariables(user.id);
    const { signedUrl, expiresAt, dynamicVariables: returned } = await startElevenLabsPortalSession('counselor', {
      dynamicVariables,
    });
    return NextResponse.json({
      signedUrl,
      expiresAt,
      dynamicVariables: returned ?? dynamicVariables,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[counselor/session]', msg);
    return NextResponse.json({ error: 'Voice sessions are not configured' }, { status: 503 });
  }
}
