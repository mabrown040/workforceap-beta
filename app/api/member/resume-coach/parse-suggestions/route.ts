import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { extractResumeCoachSuggestionsFromText } from '@/lib/ai/resumeCoachHeuristic';

const MAX_HISTORY_TURNS = 120;
const MAX_HISTORY_CHARS = 16000;

type ResumeTranscriptTurn = { speaker: 'agent' | 'user'; text: string };

function normalizeTranscript(input: Array<{ speaker: string; text: string }>): ResumeTranscriptTurn[] {
  return input
    .map((turn): ResumeTranscriptTurn => ({
      speaker: turn.speaker === 'agent' ? 'agent' : 'user',
      text: typeof turn.text === 'string' ? turn.text.trim() : '',
    }))
    .filter((turn) => turn.text.length > 0)
    .slice(0, MAX_HISTORY_TURNS);
}

function buildHistoryOutput(transcript: ResumeTranscriptTurn[], suggestions: Array<{ original?: string; suggested: string; context: string }>): string {
  const lines: string[] = [];
  lines.push('Resume voice coach transcript');
  lines.push('');
  lines.push(`Suggestions detected: ${suggestions.length}`);
  lines.push('');
  if (suggestions.length > 0) {
    lines.push('Suggestions');
    lines.push('-----------');
    suggestions.forEach((s, i) => {
      const original = s.original?.trim();
      if (original) {
        lines.push(`${i + 1}. Replace "${original}" with "${s.suggested}"`);
      } else {
        lines.push(`${i + 1}. Add "${s.suggested}"`);
      }
      lines.push(`   Why: ${s.context}`);
    });
    lines.push('');
  }
  lines.push('Transcript');
  lines.push('----------');
  transcript.forEach((turn) => {
    lines.push(`${turn.speaker === 'agent' ? 'Coach' : 'Member'}: ${turn.text}`);
  });
  return lines.join('\n').slice(0, MAX_HISTORY_CHARS);
}

/**
 * POST — parse voice coach transcript into structured resume suggestions.
 * Input: { transcript: Array<{ speaker: 'agent' | 'user'; text: string }> }
 * Output: { suggestions: Array<{ original?: string; suggested: string; context: string }> }
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { transcript: rawTranscript } = (await req.json()) as {
    transcript: Array<{ speaker: string; text: string }>;
  };

  const transcript = normalizeTranscript(rawTranscript ?? []);
  if (!transcript?.length) {
    return NextResponse.json({ suggestions: [] });
  }

  const agentLines = transcript
    .filter((t) => t.speaker === 'agent')
    .map((t) => t.text)
    .join('\n');

  // Use Anthropic to extract structured suggestions
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  let suggestions = extractResumeCoachSuggestionsFromText(agentLines);

  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
          max_tokens: 1200,
          temperature: 0.1,
          system:
            'Extract resume improvement suggestions from a voice coaching transcript. Return strict JSON array of objects with keys: original (the text to change, if quoted), suggested (the improved version), context (brief explanation). If no concrete suggestions exist, return empty array. Only include actionable resume text changes.',
          messages: [
            {
              role: 'user',
              content: `Voice coach transcript (agent lines only):\n\n${agentLines.slice(0, 6000)}`,
            },
          ],
        }),
      });

      if (res.ok) {
        const payload = (await res.json()) as {
          content?: Array<{ type: string; text?: string }>;
        };
        const text = payload.content?.find((p) => p.type === 'text')?.text;
        if (text) {
          // Extract JSON from response (may be wrapped in markdown)
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as Array<{
              original?: string;
              suggested: string;
              context: string;
            }>;
            suggestions = parsed.slice(0, 10);
          }
        }
      }
    } catch (err) {
      console.error('[parse-suggestions] Anthropic error:', err);
    }
  }

  try {
    await ensureUserInDb(user);
    const inputSummary = `Resume Helper voice session (${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'})`;
    const output = buildHistoryOutput(transcript, suggestions);
    await saveAIToolResult(user.id, 'resume_rewriter', inputSummary, output);
  } catch (saveErr) {
    console.error('[parse-suggestions] failed to persist session transcript', saveErr);
  }

  return NextResponse.json({ suggestions });
}
