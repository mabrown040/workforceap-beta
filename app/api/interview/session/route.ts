import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import {
  createConversationalSession,
  generateInterviewFeedback,
  type InterviewType,
  type TranscriptTurn,
} from '@/lib/ai/elevenlabs';

interface CreateSessionBody {
  role: string;
  interviewType: InterviewType;
}

interface FeedbackBody {
  action: 'feedback';
  role: string;
  interviewType: InterviewType;
  transcript: TranscriptTurn[];
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserInDb(user);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    typeof body === 'object' &&
    body !== null &&
    'action' in body &&
    (body as { action?: string }).action === 'feedback'
  ) {
    const payload = body as FeedbackBody;
    if (!payload.role || typeof payload.role !== 'string') {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }
    if (!['technical', 'behavioral', 'general'].includes(payload.interviewType)) {
      return NextResponse.json({ error: 'Invalid interview type' }, { status: 400 });
    }
    if (!Array.isArray(payload.transcript)) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    const feedback = await generateInterviewFeedback({
      role: payload.role,
      interviewType: payload.interviewType,
      transcript: payload.transcript,
    });

    return NextResponse.json({ feedback });
  }

  const payload = body as CreateSessionBody;
  if (!payload.role || typeof payload.role !== 'string') {
    return NextResponse.json({ error: 'Role is required' }, { status: 400 });
  }
  if (!['technical', 'behavioral', 'general'].includes(payload.interviewType)) {
    return NextResponse.json({ error: 'Invalid interview type' }, { status: 400 });
  }

  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!process.env.ELEVENLABS_API_KEY || !agentId) {
    return NextResponse.json({
      mode: 'text-fallback',
      sessionId: crypto.randomUUID(),
      token: null,
      message:
        'ElevenLabs conversational AI is not configured. Running in transcript + AI feedback mode.',
    });
  }

  try {
    const { signedUrl, expiresAt } = await createConversationalSession(agentId);
    return NextResponse.json({
      mode: 'elevenlabs',
      sessionId: crypto.randomUUID(),
      token: signedUrl,
      expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create conversation session';
    return NextResponse.json({
      mode: 'text-fallback',
      sessionId: crypto.randomUUID(),
      token: null,
      message,
    });
  }
}
