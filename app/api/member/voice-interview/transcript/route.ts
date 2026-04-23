import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getVoiceCoachTranscriptRecipients, sendVoiceCoachTranscriptEmail } from '@/lib/email';

type TranscriptTurn = { role: 'agent' | 'user'; text: string };

function normalizeTranscript(input: unknown): TranscriptTurn[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((turn): TranscriptTurn => ({
      role: turn && typeof turn === 'object' && 'speaker' in turn && turn.speaker === 'agent' ? 'agent' :
        turn && typeof turn === 'object' && 'role' in turn && turn.role === 'agent' ? 'agent' : 'user',
      text: turn && typeof turn === 'object' && 'text' in turn && typeof turn.text === 'string' ? turn.text.trim() : '',
    }))
    .filter((turn) => turn.text.length > 0);
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    transcript?: unknown;
    sessionId?: string;
    role?: string;
    interviewType?: string;
  };

  try {
    body = await req.json() as {
      transcript?: unknown;
      sessionId?: string;
      role?: string;
      interviewType?: string;
    };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const transcript = normalizeTranscript(body.transcript);
  if (transcript.length === 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { fullName: true, email: true },
    });

    const recipients = getVoiceCoachTranscriptRecipients();
    if (recipients.length > 0) {
      await sendVoiceCoachTranscriptEmail({
        to: recipients,
        memberName: dbUser?.fullName?.trim() || user.email || 'WorkforceAP member',
        memberEmail: dbUser?.email?.trim() || user.email || null,
        coachLabel: `Voice Interview${body.role?.trim() ? ` (${body.role.trim()})` : ''}`,
        transcriptTurns: transcript,
        highlights: [
          body.interviewType?.trim() ? `Interview type: ${body.interviewType.trim()}` : '',
        ].filter(Boolean),
        sessionId: body.sessionId?.trim() || null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[voice-interview transcript] failed', error);
    return NextResponse.json({ error: 'Failed to email transcript' }, { status: 500 });
  }
}
