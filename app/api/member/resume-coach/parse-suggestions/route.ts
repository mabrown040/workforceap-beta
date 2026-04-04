import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';

/**
 * POST — parse voice coach transcript into structured resume suggestions.
 * Input: { transcript: Array<{ speaker: 'agent' | 'user'; text: string }> }
 * Output: { suggestions: Array<{ original?: string; suggested: string; context: string }> }
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { transcript } = (await req.json()) as {
    transcript: Array<{ speaker: string; text: string }>;
  };

  if (!transcript?.length) {
    return NextResponse.json({ suggestions: [] });
  }

  const agentLines = transcript
    .filter((t) => t.speaker === 'agent')
    .map((t) => t.text)
    .join('\n');

  // Use Anthropic to extract structured suggestions
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    // Fallback: regex-based extraction
    return NextResponse.json({ suggestions: extractHeuristic(agentLines) });
  }

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
          return NextResponse.json({ suggestions: parsed.slice(0, 10) });
        }
      }
    }
  } catch (err) {
    console.error('[parse-suggestions] Anthropic error:', err);
  }

  return NextResponse.json({ suggestions: extractHeuristic(agentLines) });
}

function extractHeuristic(text: string) {
  const suggestions: Array<{ original?: string; suggested: string; context: string }> = [];
  // Look for patterns like "instead of X, try Y" or "change X to Y"
  const patterns = [
    /instead of ["']([^"']+)["'],?\s*(?:try|use|say)\s+["']([^"']+)["']/gi,
    /change\s+["']([^"']+)["']\s+to\s+["']([^"']+)["']/gi,
    /replace\s+["']([^"']+)["']\s+with\s+["']([^"']+)["']/gi,
  ];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      suggestions.push({
        original: m[1],
        suggested: m[2],
        context: 'Suggested by resume coach',
      });
    }
  }
  return suggestions.slice(0, 10);
}
