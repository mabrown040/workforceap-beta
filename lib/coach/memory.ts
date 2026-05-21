import { prisma } from '@/lib/db/prisma';
import { claudeChat } from '@/lib/ai/anthropicChat';

export type CoachTurn = { role: 'agent' | 'user'; text: string };

const MAX_EXCHANGES = 8;
const MAX_SUMMARY_CHARS = 3500;

const MEMORY_SYSTEM_PROMPT = `You maintain a rolling memory for a workforce-development AI coach.
Given the member's prior memory (if any) and the latest conversation excerpt, produce a JSON object with exactly these keys:
  - "summary": 2–5 sentences merging prior context with new facts (goals, blockers, progress, preferences). Max 600 words. No PII beyond what appears in the transcript.
  - "last_topic": short phrase for what they focused on most recently (e.g. "resume bullets", "interview prep").
  - "last_action": one concrete next step the coach suggested or the member committed to, or empty string if none.

Respond with ONLY valid JSON. No markdown fences.`;

export function takeLastCoachExchanges(turns: CoachTurn[], maxExchanges = MAX_EXCHANGES): CoachTurn[] {
  if (turns.length <= maxExchanges) return turns;
  return turns.slice(-maxExchanges);
}

export function formatCoachTranscript(turns: CoachTurn[]): string {
  return turns
    .map((t) => `${t.role === 'agent' ? 'Coach' : 'Member'}: ${t.text}`)
    .join('\n');
}

export function appendCoachMemoryToSystemPrompt(
  systemPrompt: string,
  summary: string | null | undefined
): string {
  const trimmed = summary?.trim();
  if (!trimmed) return systemPrompt;
  return `${systemPrompt}\n\nPrior coaching context (continue naturally; do not read aloud verbatim):\n${trimmed}`;
}

export async function loadCoachMemory(userId: string): Promise<string | null> {
  const row = await prisma.coachMemory.findUnique({
    where: { userId },
    select: { summary: true },
  });
  const summary = row?.summary?.trim();
  return summary || null;
}

export async function getCoachMemoryDynamicVariables(
  userId: string
): Promise<{ coach_memory_summary: string }> {
  const summary = await loadCoachMemory(userId);
  return { coach_memory_summary: summary ?? '' };
}

function parseMemoryResponse(text: string): {
  summary: string;
  lastTopic: string | null;
  lastAction: string | null;
} | null {
  try {
    const parsed = JSON.parse(text) as {
      summary?: unknown;
      last_topic?: unknown;
      last_action?: unknown;
    };
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    if (!summary) return null;
    const lastTopic =
      typeof parsed.last_topic === 'string' && parsed.last_topic.trim()
        ? parsed.last_topic.trim().slice(0, 200)
        : null;
    const lastAction =
      typeof parsed.last_action === 'string' && parsed.last_action.trim()
        ? parsed.last_action.trim().slice(0, 500)
        : null;
    return {
      summary: summary.slice(0, MAX_SUMMARY_CHARS),
      lastTopic,
      lastAction,
    };
  } catch {
    return null;
  }
}

export async function updateCoachMemory(params: {
  userId: string;
  recentTurns: CoachTurn[];
}): Promise<void> {
  const { userId, recentTurns } = params;
  const recent = takeLastCoachExchanges(recentTurns);
  if (recent.length === 0) return;

  const existing = await prisma.coachMemory.findUnique({
    where: { userId },
    select: { summary: true, lastTopic: true, lastAction: true },
  });

  const userPrompt = [
    existing?.summary?.trim()
      ? `Prior memory summary:\n${existing.summary.trim()}`
      : 'Prior memory summary: (none — first session)',
    existing?.lastTopic ? `Prior last topic: ${existing.lastTopic}` : null,
    existing?.lastAction ? `Prior last action: ${existing.lastAction}` : null,
    '',
    'Latest conversation excerpt:',
    formatCoachTranscript(recent),
    '',
    'Update the memory JSON from this excerpt.',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const raw = await claudeChat(MEMORY_SYSTEM_PROMPT, userPrompt, {
    maxTokens: 700,
    temperature: 0.2,
  });
  if (!raw) {
    console.warn('[coach/memory] summarization skipped — no AI provider response');
    return;
  }

  const parsed = parseMemoryResponse(raw);
  if (!parsed) {
    console.warn('[coach/memory] failed to parse summarization JSON');
    return;
  }

  await prisma.coachMemory.upsert({
    where: { userId },
    create: {
      userId,
      summary: parsed.summary,
      lastTopic: parsed.lastTopic,
      lastAction: parsed.lastAction,
    },
    update: {
      summary: parsed.summary,
      lastTopic: parsed.lastTopic,
      lastAction: parsed.lastAction,
    },
  });
}
