import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { prisma } from '@/lib/db/prisma';

interface CheckpointBody {
  transcript: { role: 'agent' | 'user'; text: string }[];
  toolType?: string;
  inputSummary?: string;
}

/** Lightweight checkpoint endpoint for voice sessions.
 *  Saves transcript without AI processing (no action-plan generation, no emails).
 *  Used for auto-save during session and on unexpected disconnect.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: CheckpointBody;
  try {
    body = await req.json() as CheckpointBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const transcript = Array.isArray(body.transcript) ? body.transcript : [];
  if (transcript.length === 0) {
    return NextResponse.json({ ok: true, saved: false, reason: 'empty' });
  }

  const toolType = (body.toolType ?? 'career_counselor') as 'career_counselor';
  const inputSummary = body.inputSummary ?? 'Voice session checkpoint';

  // Build lightweight output — just the transcript, no AI action plan
  const lines: string[] = [];
  lines.push('Career readiness voice coach transcript');
  lines.push('');
  lines.push('Transcript');
  lines.push('----------');
  transcript.forEach((turn) => {
    lines.push(`${turn.role === 'agent' ? 'Coach' : 'Member'}: ${turn.text}`);
  });
  const output = lines.join('\n').slice(0, 16000);

  try {
    await ensureUserInDb(user);

    // Delete previous checkpoint for this session to avoid clutter
    // (We identify by inputSummary containing "checkpoint" and recent time)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await prisma.aIToolResult.deleteMany({
      where: {
        userId: user.id,
        toolType,
        inputSummary: { contains: 'checkpoint' },
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    const result = await saveAIToolResult(
      user.id,
      toolType,
      inputSummary,
      output
    );

    return NextResponse.json({ ok: true, saved: true });
  } catch (err) {
    console.error('[voice-session/checkpoint] save error:', err);
    return NextResponse.json({ error: 'Failed to save checkpoint' }, { status: 500 });
  }
}
