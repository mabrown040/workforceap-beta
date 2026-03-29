import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import type { InterviewType, TranscriptTurn } from '@/lib/ai/elevenlabs';

interface FeedbackPayload {
  summary: string;
  strengths: string[];
  improvements: string[];
  overallScore: number;
  source: 'anthropic' | 'heuristic';
}

interface HistoryRecord {
  id: string;
  role: string;
  interviewType: InterviewType;
  transcript: TranscriptTurn[];
  feedback: FeedbackPayload;
  createdAt: string;
}

interface SaveHistoryBody {
  role: string;
  interviewType: InterviewType;
  transcript: TranscriptTurn[];
  feedback: FeedbackPayload;
}

const HISTORY_TOOL_TYPE = 'interview_practice' as const;

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const records = await prisma.aIToolResult.findMany({
    where: {
      userId: user.id,
      toolType: HISTORY_TOOL_TYPE,
      inputSummary: { startsWith: '[Interview Coach]' },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const sessions: HistoryRecord[] = records
    .map((record) => {
      try {
        const parsed = JSON.parse(record.output) as {
          role: string;
          interviewType: InterviewType;
          transcript: TranscriptTurn[];
          feedback: FeedbackPayload;
        };

        return {
          id: record.id,
          role: parsed.role,
          interviewType: parsed.interviewType,
          transcript: parsed.transcript,
          feedback: parsed.feedback,
          createdAt: record.createdAt.toISOString(),
        } satisfies HistoryRecord;
      } catch {
        return null;
      }
    })
    .filter((item): item is HistoryRecord => item !== null);

  return NextResponse.json({ sessions });
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

  const payload = body as SaveHistoryBody;

  if (!payload.role || typeof payload.role !== 'string') {
    return NextResponse.json({ error: 'Role is required' }, { status: 400 });
  }

  if (!['technical', 'behavioral', 'general'].includes(payload.interviewType)) {
    return NextResponse.json({ error: 'Invalid interview type' }, { status: 400 });
  }

  if (!Array.isArray(payload.transcript)) {
    return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
  }

  if (!payload.feedback || typeof payload.feedback.summary !== 'string') {
    return NextResponse.json({ error: 'Feedback is required' }, { status: 400 });
  }

  const saved = await prisma.aIToolResult.create({
    data: {
      userId: user.id,
      toolType: HISTORY_TOOL_TYPE,
      inputSummary: `[Interview Coach] ${payload.role} (${payload.interviewType})`,
      output: JSON.stringify({
        role: payload.role,
        interviewType: payload.interviewType,
        transcript: payload.transcript,
        feedback: payload.feedback,
      }),
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({ id: saved.id, createdAt: saved.createdAt.toISOString() });
}
