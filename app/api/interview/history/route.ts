import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';

interface SaveHistoryBody {
  role: string;
  interviewType: string;
  transcript: Array<{ speaker: 'interviewer' | 'candidate'; text: string }>;
  feedback: string;
}

/**
 * GET /api/interview/history — retrieve saved sessions for current user
 */
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await prisma.aIToolResult.findMany({
    where: { userId: user.id, toolType: 'interview_coach' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, inputSummary: true, output: true, createdAt: true },
  });

  return NextResponse.json({ sessions: results });
}

/**
 * POST /api/interview/history — save a completed interview session
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { role, interviewType, transcript, feedback } = body as SaveHistoryBody;

  if (!role || !interviewType || !Array.isArray(transcript)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const inputSummary = `${role} — ${interviewType}`;
  const output = JSON.stringify({ role, interviewType, transcript, feedback });

  try {
    await ensureUserInDb(user);
    const result = await prisma.aIToolResult.create({
      data: {
        userId: user.id,
        toolType: 'interview_coach',
        inputSummary,
        output,
      },
    });

    return NextResponse.json({ id: result.id, saved: true });
  } catch (err) {
    console.error('[interview/history] Save error:', err);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}
