import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { fetchMemberPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';

/** POST — signed URL for voice mock interview with role / style context. */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { role?: string; interviewType?: string } = {};
  try {
    body = (await req.json()) as { role?: string; interviewType?: string };
  } catch {
    /* empty body */
  }

  const role = body.role?.trim() || 'the candidate';
  const interviewType = body.interviewType?.trim() || 'Behavioral';

  const member = await fetchMemberPortalDynamicVariables(user.id);
  const dynamicVariables = {
    ...member,
    target_role: role,
    interview_type: interviewType,
  };

  try {
    const { signedUrl, expiresAt } = await startElevenLabsPortalSession('interview', {
      dynamicVariables,
    });
    return NextResponse.json({ signedUrl, expiresAt, dynamicVariables });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[member/voice-interview/session]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
