import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { signedUrl } = await startElevenLabsPortalSession('counselor');
    return NextResponse.json({ signedUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[counselor/session]', msg);
    return NextResponse.json({ error: 'Voice sessions are not configured' }, { status: 503 });
  }
}
