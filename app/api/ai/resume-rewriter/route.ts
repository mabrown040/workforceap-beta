import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { resumeRewriterSchema } from '@/lib/validation/resumeRewriter';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAIConfigured()) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  const { success } = await checkAIToolRateLimit(user.id);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again in an hour.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = resumeRewriterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 400 }
    );
  }

  const { resume, jobTarget } = parsed.data;

  const systemPrompt = `You are a professional resume writer and career coach. Your task is to improve resume content to better match a target job and pass ATS systems.

Guidelines:
- Use strong action verbs (Led, Achieved, Implemented, etc.)
- Add quantifiable metrics where possible
- Include relevant keywords from the job target
- Keep the member's actual experience accurate—do not invent roles or achievements
- Use clear, professional language
- Format as plain text with clear section headers
- Output the improved resume in full, not just bullet points`;

  const userPrompt = `Job target: ${jobTarget}

Current resume content:
---
${resume}
---

Rewrite and improve the resume to better align with this job target. Return the full improved resume.`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 4000, temperature: 0.7 }
    );

    if (!output) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    await saveAIToolResult(user.id, 'resume_rewriter', jobTarget, output);

    return NextResponse.json({ output });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Resume rewriter error:', err);
    if (message.includes('rate') || message.includes('429')) {
      return NextResponse.json({ error: 'AI service is busy. Please try again in a minute.' }, { status: 429 });
    }
    if (message.includes('401') || message.includes('invalid') || message.includes('api_key')) {
      return NextResponse.json({ error: 'AI service configuration error. Please contact support.' }, { status: 503 });
    }
    return NextResponse.json(
      { error: 'Failed to process your resume. Please try again.' },
      { status: 500 }
    );
  }
}
