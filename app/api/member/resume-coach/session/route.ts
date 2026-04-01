import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';

/** POST — signed URL for resume-focused voice coach. */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { signedUrl, expiresAt } = await startElevenLabsPortalSession('resume_coach');
    return NextResponse.json({ signedUrl, expiresAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[member/resume-coach/session]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
