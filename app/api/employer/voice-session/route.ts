import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';

/** POST — signed URL for employer ElevenLabs agent (hiring / portal help). */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) {
    return NextResponse.json({ error: 'Employer portal access required' }, { status: 403 });
  }

  try {
    const { signedUrl, expiresAt } = await startElevenLabsPortalSession('employer');
    return NextResponse.json({ signedUrl, expiresAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[employer/voice-session]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
