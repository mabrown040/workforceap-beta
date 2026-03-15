import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { resumeRewriterSchema } from '@/lib/validation/resumeRewriter';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!openai) {
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const output = completion.choices[0]?.message?.content?.trim();
    if (!output) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    return NextResponse.json({ output });
  } catch (err) {
    console.error('Resume rewriter error:', err);
    return NextResponse.json(
      { error: 'Failed to process your resume. Please try again.' },
      { status: 500 }
    );
  }
}
