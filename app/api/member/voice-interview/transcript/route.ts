import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getVoiceCoachTranscriptRecipients, sendVoiceCoachTranscriptEmail } from '@/lib/email';
import { completeCareerOsInterviewActions } from '@/lib/workflows/completeCareerOsActions';

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

function hasMeaningfulUserPractice(transcript: TranscriptTurn[]) {
  const userTurns = transcript.filter((turn) => turn.role === 'user');
  const meaningfulTurns = userTurns.filter((turn) => turn.text.trim().length >= 20);
  const totalUserChars = userTurns.reduce((sum, turn) => sum + turn.text.trim().length, 0);
  return meaningfulTurns.length >= 1 && totalUserChars >= 40;
}

export async function POST(req: NextRequest) {
  try {
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
  
    const sessionId = body.sessionId?.trim() || null;
    const meaningfulPractice = hasMeaningfulUserPractice(transcript);
  
    try {
      if (meaningfulPractice) {
        let alreadyRecorded = false;
        if (sessionId) {
          const existing = await prisma.memberEvent.findFirst({
            where: {
              userId: user.id,
              eventName: 'career_os.interview_practice_completed',
              entityType: 'voice_interview_session',
              entityId: sessionId,
            },
            select: { id: true },
          });
          alreadyRecorded = !!existing;
        }
  
        if (!alreadyRecorded) {
          await prisma.memberEvent.create({
            data: {
              userId: user.id,
              eventName: 'career_os.interview_practice_completed',
              entityType: 'voice_interview_session',
              entityId: sessionId ?? `voice-interview-${Date.now()}`,
              sourcePage: '/api/member/voice-interview/transcript',
              metadata: {
                role: body.role?.trim() || null,
                interviewType: body.interviewType?.trim() || null,
                userTurnCount: transcript.filter((turn) => turn.role === 'user').length,
              },
            },
          });
        }
  
        await completeCareerOsInterviewActions(user.id).catch((error) => {
          console.error('[voice-interview transcript] completeCareerOsInterviewActions failed', error);
        });
      }
  
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
          sessionId,
        });
      }
  
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('[voice-interview transcript] failed', error);
      return NextResponse.json({ error: 'Failed to email transcript' }, { status: 500 });
    }
  } catch (error) {
    console.error('/member/voice-interview/transcript:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
