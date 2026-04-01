import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';

/** POST — signed URL for partner-facing voice assistant. Requires `ELEVENLABS_PARTNER_AGENT_ID`. */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) {
    return NextResponse.json({ error: 'Partner portal access required' }, { status: 403 });
  }

  try {
    const { signedUrl, expiresAt } = await startElevenLabsPortalSession('partner');
    return NextResponse.json({ signedUrl, expiresAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[partner/voice-session]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
