import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';

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

  const dynamicContext = [
    'You are conducting a mock job interview.',
    `Target role the candidate is preparing for: ${role}.`,
    `Primary interview style: ${interviewType}.`,
    'Ask one focused question at a time. After they answer, give brief constructive feedback, then move on.',
    'Keep turns concise so the session feels like a real screening interview.',
  ].join('\n');

  try {
    const { signedUrl, expiresAt, dynamicContext: ctx } = await startElevenLabsPortalSession('interview', {
      dynamicContext,
    });
    return NextResponse.json({ signedUrl, expiresAt, dynamicContext: ctx });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[member/voice-interview/session]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
