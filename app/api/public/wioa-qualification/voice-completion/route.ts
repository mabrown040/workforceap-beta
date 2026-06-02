import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getVoiceCoachTranscriptRecipients, sendVoiceCoachTranscriptEmail } from '@/lib/email';

type TranscriptTurn = { role: 'agent' | 'user'; text: string };

const payloadSchema = z.object({
  fullName: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional(),
  countyOrZip: z.string().trim().max(120).optional(),
  screeningSource: z.string().trim().max(80).optional(),
  sessionId: z.string().trim().max(200).optional(),
  transcript: z.array(z.unknown()).optional(),
});

function normalizeTranscript(input: unknown): TranscriptTurn[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((turn): TranscriptTurn => {
      const role =
        turn && typeof turn === 'object' && 'speaker' in turn && turn.speaker === 'agent'
          ? 'agent'
          : turn && typeof turn === 'object' && 'role' in turn && turn.role === 'agent'
            ? 'agent'
            : 'user';
      const text =
        turn && typeof turn === 'object' && 'text' in turn && typeof turn.text === 'string'
          ? turn.text.trim()
          : '';

      return { role, text };
    })
    .filter((turn) => turn.text.length > 0)
    .slice(0, 200);
}

export async function POST(request: NextRequest) {
  let parsed: z.infer<typeof payloadSchema>;
  try {
    parsed = payloadSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const transcript = normalizeTranscript(parsed.transcript);
  if (transcript.length === 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const memberName = parsed.fullName?.trim() || parsed.email?.trim() || 'Public WIOA visitor';
  const memberEmail = parsed.email?.trim() || null;
  const highlights = [
    'Source: Public WIOA voice pre-check',
    parsed.countyOrZip?.trim() ? `County / ZIP: ${parsed.countyOrZip.trim()}` : null,
    parsed.phone?.trim() ? `Phone: ${parsed.phone.trim()}` : null,
    parsed.screeningSource?.trim() ? `Capture flow: ${parsed.screeningSource.trim()}` : null,
    'Structured WIOA form submission may still be needed for full follow-up.',
  ].filter((value): value is string => Boolean(value));

  const recipients = getVoiceCoachTranscriptRecipients([
    process.env.WIOA_SCREENING_NOTIFY_EMAIL ?? 'info@workforceap.org',
  ]);

  const emailResult = await sendVoiceCoachTranscriptEmail({
    to: recipients,
    memberName,
    memberEmail,
    coachLabel: 'WIOA Pre-Qualification Guide',
    transcriptTurns: transcript,
    highlights,
    sessionId: parsed.sessionId?.trim() || null,
  });

  return NextResponse.json({
    ok: true,
    emailed: emailResult.ok,
    error: emailResult.ok ? undefined : emailResult.error,
  });
}
