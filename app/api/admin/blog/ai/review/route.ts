import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { chatCompletion, groqRouteErrorResult, isAIConfigured } from '@/lib/ai/groq';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!isAIConfigured())
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json({ error: 'Missing title or content' }, { status: 400 });
  }

  const { title, content, excerpt } = parsed;

  const systemPrompt = `You are an editor for WorkforceAP blog. Review the draft and provide actionable feedback.

Output a JSON object with:
- overallScore: number (1-10)
- summary: string (1-2 sentences)
- strengths: string[] (2-4 items)
- improvements: string[] (2-4 items)
- seoSuggestions: string[] (optional keywords, meta tips)
- toneNote: string (optional, if tone is off)

Be constructive and specific.`;

  const userPrompt = `Title: ${title}
${excerpt ? `Excerpt: ${excerpt}\n` : ''}

Content:
---
${content}
---

Review this draft.`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 800, temperature: 0.3 }
    );

    if (!output) return NextResponse.json({ error: 'No response from AI' }, { status: 500 });

    const cleaned = output.replace(/```json?\s*/g, '').replace(/```\s*$/g, '').trim();
    const parsedOutput = JSON.parse(cleaned) as {
      overallScore?: number;
      summary?: string;
      strengths?: string[];
      improvements?: string[];
      seoSuggestions?: string[];
      toneNote?: string;
    };

    return NextResponse.json(parsedOutput);
  } catch (err) {
    console.error('Blog AI review error:', err);
    const { status, body, headers } = groqRouteErrorResult(err, 'Failed to review. Please try again.');
    return NextResponse.json(body, { status, headers });
  }
}

function parseBody(body: unknown): { title: string; content: string; excerpt?: string } | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title.trim() : null;
  const content = typeof o.content === 'string' ? o.content.trim() : null;
  const excerpt = typeof o.excerpt === 'string' ? o.excerpt.trim() : undefined;
  if (!title || !content) return null;
  return { title, content, excerpt };
}
