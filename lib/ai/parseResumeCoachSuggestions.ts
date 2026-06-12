import { extractResumeCoachSuggestionsFromText } from '@/lib/ai/resumeCoachHeuristic';
import { claudeChat } from './anthropicChat';

const MAX_HISTORY_TURNS = 120;
const MAX_AGENT_CHARS = 6000;

export type ResumeTranscriptTurn = { speaker: 'agent' | 'user'; text: string };

export type ResumeCoachSuggestion = {
  original?: string;
  suggested: string;
  context: string;
};

export function normalizeResumeCoachTranscript(
  input: Array<{ speaker?: string; text?: string }>
): ResumeTranscriptTurn[] {
  return input
    .map((turn): ResumeTranscriptTurn => ({
      speaker: turn.speaker === 'agent' ? 'agent' : 'user',
      text: typeof turn.text === 'string' ? turn.text.trim() : '',
    }))
    .filter((turn) => turn.text.length > 0)
    .slice(0, MAX_HISTORY_TURNS);
}

function sanitizeSuggestions(
  suggestions: Array<{ original?: string; suggested?: string; context?: string }>,
  maxSuggestions = 10
): ResumeCoachSuggestion[] {
  const seen = new Set<string>();
  const out: ResumeCoachSuggestion[] = [];

  for (const suggestion of suggestions) {
    const suggested = suggestion.suggested?.trim();
    if (!suggested) continue;

    const original = suggestion.original?.trim() || undefined;
    const context = suggestion.context?.trim() || 'Suggested by resume coach';
    const key = `${original ?? ''}→${suggested}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ original, suggested, context });
    if (out.length >= maxSuggestions) break;
  }

  return out;
}

export async function parseResumeCoachSuggestionsFromTranscript(
  input: Array<{ speaker?: string; text?: string }>,
  options?: {
    maxSuggestions?: number;
    maxAgentChars?: number;
    aiChat?: typeof claudeChat;
  }
): Promise<ResumeCoachSuggestion[]> {
  const transcript = normalizeResumeCoachTranscript(input);
  if (!transcript.length) return [];

  const maxSuggestions = options?.maxSuggestions ?? 10;
  const agentLines = transcript
    .filter((turn) => turn.speaker === 'agent')
    .map((turn) => turn.text)
    .join('\n')
    .slice(0, options?.maxAgentChars ?? MAX_AGENT_CHARS);

  if (!agentLines.trim()) return [];

  let suggestions = sanitizeSuggestions(
    extractResumeCoachSuggestionsFromText(agentLines),
    maxSuggestions
  );

  const systemPrompt =
    'Extract resume improvement suggestions from a voice coaching transcript. Return strict JSON array of objects with keys: original (the text to change, if quoted), suggested (the improved version), context (brief explanation). If no concrete suggestions exist, return empty array. Only include actionable resume text changes.';
  const userPrompt = `Voice coach transcript (agent lines only):\n\n${agentLines}`;

  try {
    const text = await (options?.aiChat ?? claudeChat)(systemPrompt, userPrompt, {
      maxTokens: 1200,
      temperature: 0.1,
    });
    if (text) {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{
          original?: string;
          suggested?: string;
          context?: string;
        }>;
        suggestions = sanitizeSuggestions(parsed, maxSuggestions);
      }
    }
  } catch (err) {
    console.error('[resume-coach-suggestions] AI parse error:', err);
  }

  return suggestions;
}
