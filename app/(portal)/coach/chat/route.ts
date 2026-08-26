import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { chatCompletion } from '@/lib/ai/groq';
import { ifAiUnconfigured } from '@/lib/ai/aiUnavailableResponse';
import { cleanSpokenLine } from '@/lib/ai/postProcess';
import {
  appendCoachMemoryToSystemPrompt,
  loadCoachMemory,
  updateCoachMemory,
  type CoachTurn,
} from '@/lib/coach/memory';
import { withApiGuc } from '@/lib/db/withRequestGuc';

const BASE_COACH_SYSTEM = `You are a WorkforceAP career coach helping members with job search, interviews, resumes, and career planning.
Be practical, warm, and concise. Ask one focused question at a time when clarifying.
Do not give medical, legal, or financial advice.`;

type ChatHistoryEntry = { role: 'user' | 'assistant'; content: string };

function normalizeHistory(input: unknown): ChatHistoryEntry[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry): ChatHistoryEntry | null => {
      if (!entry || typeof entry !== 'object') return null;
      const role = 'role' in entry && entry.role === 'assistant' ? 'assistant' : 'user';
      const content =
        'content' in entry && typeof entry.content === 'string' ? entry.content.trim() : '';
      if (!content) return null;
      return { role, content };
    })
    .filter((entry): entry is ChatHistoryEntry => entry !== null);
}

function historyToCoachTurns(history: ChatHistoryEntry[], coachReply: string, memberMessage: string): CoachTurn[] {
  const turns: CoachTurn[] = [];
  for (const entry of history) {
    turns.push({
      role: entry.role === 'assistant' ? 'agent' : 'user',
      text: entry.content,
    });
  }
  turns.push({ role: 'user', text: memberMessage });
  turns.push({ role: 'agent', text: coachReply });
  return turns;
}

export const POST = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unconfigured = ifAiUnconfigured();
    if (unconfigured) return unconfigured;

    const { success } = await checkAIToolRateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a few minutes.' },
        { status: 429 }
      );
    }

    let body: { message?: unknown; history?: unknown };
    try {
      body = (await req.json()) as { message?: unknown; history?: unknown };
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const history = normalizeHistory(body.history);
    const memorySummary = await loadCoachMemory(user.id);
    const systemPrompt = appendCoachMemoryToSystemPrompt(BASE_COACH_SYSTEM, memorySummary);

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];
    for (const entry of history) {
      messages.push({ role: entry.role, content: entry.content });
    }
    messages.push({ role: 'user', content: message });

    const raw = await chatCompletion(messages, { maxTokens: 600, temperature: 0.6 });
    const reply = cleanSpokenLine(
      raw ?? 'I am having trouble responding right now. Please try again in a moment.'
    );

    const recentTurns = historyToCoachTurns(history, reply, message);
    void updateCoachMemory({ userId: user.id, recentTurns }).catch((err) => {
      console.error('[coach/chat] memory update failed:', err);
    });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('/coach/chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
